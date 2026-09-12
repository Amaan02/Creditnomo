/**
 * Attestcoin-backed cross-chain deposit business logic.
 *
 * Flow:
 * 1. User sends ETH on Sepolia → Creditnomo Sepolia deposit address
 * 2. Attestcoin attests that Sepolia block on Creditcoin
 * 3. We generate Merkle + continuity proofs (@gluwa/usc-sdk)
 * 4. We verifyAndEmit on Creditcoin BlockProver (0x…0FD2)
 * 5. House balance is credited in CTC at the configured testnet rate
 */

import { ethers } from 'ethers';
import { attestcoinConfig } from './config';
import {
  getSourceTxBlockNumber,
  isHeightAttested,
  proveAndVerifyTransaction,
} from './client';
import { updateHouseBalance } from '@/lib/ctc/database';
import { supabase } from '@/lib/ctc/database';

export interface SepoliaDepositDetails {
  txHash: string;
  from: string;
  to: string;
  valueWei: bigint;
  valueEth: string;
  blockNumber: number;
}

export interface AttestedDepositResult {
  success: true;
  newBalance: string;
  creditedCtc: string;
  ethAmount: string;
  sepoliaTxHash: string;
  sepoliaBlockNumber: number;
  creditcoinEmitTxHash?: string;
  chainKey: number;
  alreadyProcessed?: boolean;
}

/**
 * Load Sepolia native transfer and validate it is a deposit to our receiver.
 */
export async function fetchAndValidateSepoliaDeposit(
  txHash: string,
  expectedUserAddress: string
): Promise<SepoliaDepositDetails> {
  const provider = new ethers.JsonRpcProvider(attestcoinConfig.sepoliaRpcUrl);
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!tx || !receipt) {
    throw new Error('Sepolia transaction not found');
  }
  if (receipt.status !== 1) {
    throw new Error('Sepolia transaction failed on-chain');
  }
  if (!tx.blockNumber) {
    throw new Error('Sepolia transaction not yet mined');
  }

  const from = (tx.from || '').toLowerCase();
  const to = (tx.to || '').toLowerCase();
  const depositTo = attestcoinConfig.sepoliaDepositAddress.toLowerCase();
  const user = expectedUserAddress.toLowerCase();

  if (from !== user) {
    throw new Error('Sepolia tx sender must match the connected Creditnomo wallet address');
  }
  if (to !== depositTo) {
    throw new Error(
      `Sepolia tx must send ETH to the Attestcoin deposit address (${attestcoinConfig.sepoliaDepositAddress})`
    );
  }
  if (tx.value <= BigInt(0)) {
    throw new Error('Sepolia deposit amount must be greater than 0');
  }

  return {
    txHash,
    from,
    to,
    valueWei: tx.value,
    valueEth: ethers.formatEther(tx.value),
    blockNumber: tx.blockNumber,
  };
}

export function ethToCtcCredit(valueEth: string): string {
  const eth = parseFloat(valueEth);
  if (!Number.isFinite(eth) || eth <= 0) {
    throw new Error('Invalid ETH amount');
  }
  const ctc = eth * attestcoinConfig.ethToCtcRate;
  return ctc.toFixed(18);
}

async function findExistingAttestedDeposit(txHash: string) {
  const { data, error } = await supabase
    .from('attestcoin_deposits')
    .select('*')
    .eq('sepolia_tx_hash', txHash.toLowerCase())
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // Table may not exist yet in some envs — treat as no row
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return null;
    }
    console.error('[Attestcoin] lookup error:', error);
  }
  return data;
}

async function recordAttestedDeposit(row: {
  user_address: string;
  sepolia_tx_hash: string;
  sepolia_block_number: number;
  eth_amount: string;
  ctc_credited: string;
  chain_key: number;
  creditcoin_emit_tx_hash?: string;
}) {
  const { error } = await supabase.from('attestcoin_deposits').insert({
    ...row,
    user_address: row.user_address.toLowerCase(),
    sepolia_tx_hash: row.sepolia_tx_hash.toLowerCase(),
    status: 'credited',
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Unique violation = concurrent double submit; ignore if already there
    if (error.code === '23505') return;
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.warn(
        '[Attestcoin] attestcoin_deposits table missing — run supabase/migrations/022_attestcoin_deposits.sql'
      );
      return;
    }
    throw error;
  }
}

/**
 * Status check used by the UI while waiting for Attestcoin attestation.
 */
export async function getAttestedDepositStatus(txHash: string, userAddress: string) {
  const existing = await findExistingAttestedDeposit(txHash);
  if (existing) {
    return {
      status: 'credited' as const,
      deposit: existing,
      message: 'This Sepolia deposit was already attested and credited',
    };
  }

  const details = await fetchAndValidateSepoliaDeposit(txHash, userAddress);
  const attested = await isHeightAttested(details.blockNumber);

  if (!attested) {
    return {
      status: 'awaiting_attestation' as const,
      blockNumber: details.blockNumber,
      ethAmount: details.valueEth,
      depositAddress: attestcoinConfig.sepoliaDepositAddress,
      message: `Waiting for Attestcoin to attest Sepolia block ${details.blockNumber}`,
    };
  }

  return {
    status: 'ready' as const,
    blockNumber: details.blockNumber,
    ethAmount: details.valueEth,
    depositAddress: attestcoinConfig.sepoliaDepositAddress,
    message: 'Block attested — ready to prove, verify, and credit',
  };
}

/**
 * Prove Sepolia deposit with Attestcoin, emit on Creditcoin, credit house balance.
 */
export async function processAttestedDeposit(
  userAddress: string,
  txHash: string
): Promise<AttestedDepositResult> {
  const existing = await findExistingAttestedDeposit(txHash);
  if (existing) {
    const { getHouseBalance } = await import('@/lib/ctc/database');
    const balance = await getHouseBalance(userAddress);
    return {
      success: true,
      newBalance: balance,
      creditedCtc: String(existing.ctc_credited),
      ethAmount: String(existing.eth_amount),
      sepoliaTxHash: txHash,
      sepoliaBlockNumber: Number(existing.sepolia_block_number),
      creditcoinEmitTxHash: existing.creditcoin_emit_tx_hash || undefined,
      chainKey: Number(existing.chain_key),
      alreadyProcessed: true,
    };
  }

  const details = await fetchAndValidateSepoliaDeposit(txHash, userAddress);
  // Ensure block still resolvable
  await getSourceTxBlockNumber(txHash);

  const proveResult = await proveAndVerifyTransaction(txHash, {
    chainKey: attestcoinConfig.sepoliaChainKey,
    emitOnChain: true,
  });

  const creditedCtc = ethToCtcCredit(details.valueEth);
  const newBalance = await updateHouseBalance(
    userAddress,
    creditedCtc,
    'attestcoin_deposit',
    proveResult.emitTxHash || txHash
  );

  await recordAttestedDeposit({
    user_address: userAddress,
    sepolia_tx_hash: txHash,
    sepolia_block_number: details.blockNumber,
    eth_amount: details.valueEth,
    ctc_credited: creditedCtc,
    chain_key: proveResult.chainKey,
    creditcoin_emit_tx_hash: proveResult.emitTxHash,
  });

  return {
    success: true,
    newBalance,
    creditedCtc,
    ethAmount: details.valueEth,
    sepoliaTxHash: txHash,
    sepoliaBlockNumber: details.blockNumber,
    creditcoinEmitTxHash: proveResult.emitTxHash,
    chainKey: proveResult.chainKey,
  };
}
