/**
 * Attestcoin Protocol client
 *
 * Wraps @gluwa/usc-sdk (Attestcoin / USC SDK) for:
 * - querying attested source chains
 * - waiting for block attestation
 * - generating Merkle + continuity proofs
 * - verifying proofs on Creditcoin (call + on-chain emit)
 *
 * @see https://docs.attestcoin.org/attestcoin-protocol/dapp-builder-infrastructure/attestcoin-sdk-usc-sdk
 */

import { JsonRpcProvider, Wallet } from 'ethers';
import { chainInfo, blockProver, proofProvider } from '@gluwa/usc-sdk';
import {
  attestcoinConfig,
  ATTESTCOIN_BLOCK_PROVER,
  ATTESTCOIN_CHAIN_INFO,
} from './config';

export interface SupportedChain {
  chainKey: number;
  chainId: number;
  chainName: string;
  chainEncoding?: number;
}

export interface AttestcoinProofResult {
  chainKey: number;
  headerNumber: number;
  txHash: string;
  txBytes: string;
  merkleProof: unknown;
  continuityProof: unknown;
  cached?: boolean;
}

export interface ProveAndVerifyResult {
  verified: boolean;
  proof: AttestcoinProofResult;
  emitTxHash?: string;
  blockNumber: number;
  chainKey: number;
}

function getCreditcoinProvider(): JsonRpcProvider {
  return new JsonRpcProvider(attestcoinConfig.creditcoinRpcUrl);
}

function getSourceProvider(): JsonRpcProvider {
  return new JsonRpcProvider(attestcoinConfig.sepoliaRpcUrl);
}

function getProofBuilder(chainKey: number = attestcoinConfig.sepoliaChainKey) {
  return new proofProvider.service.ProofBuilder(
    chainKey,
    attestcoinConfig.proofBuilderUrl,
    attestcoinConfig.proofBuilderTimeoutMs
  );
}

function getChainInfoProvider() {
  // Cast: project ethers v6 vs SDK peer ethers types can diverge under dual installs
  return new chainInfo.PrecompileChainInfoProvider(getCreditcoinProvider() as any);
}

function getBlockProver() {
  return new blockProver.PrecompileBlockProver(getCreditcoinProvider() as any);
}

/**
 * List source chains currently supported by Attestcoin on Creditcoin.
 */
export async function getSupportedAttestcoinChains(): Promise<SupportedChain[]> {
  const provider = getChainInfoProvider();
  const chains = await provider.getSupportedChains();
  return (chains || []).map((c: any) => {
    let chainName = String(c.chainName ?? c.name ?? 'Unknown');
    // On-chain names may be hex-encoded UTF-8 (e.g. 0x5365706f6c6961…)
    if (/^0x[0-9a-fA-F]+$/.test(chainName) && chainName.length > 2) {
      try {
        chainName = Buffer.from(chainName.slice(2), 'hex').toString('utf8');
      } catch {
        /* keep hex */
      }
    }
    return {
      chainKey: Number(c.chainKey ?? c.key ?? 0),
      chainId: Number(c.chainId ?? 0),
      chainName,
      chainEncoding: c.chainEncoding != null ? Number(c.chainEncoding) : undefined,
    };
  });
}

/**
 * Resolve Sepolia tx → block number (throws if missing / not mined).
 */
export async function getSourceTxBlockNumber(txHash: string): Promise<number> {
  const source = getSourceProvider();
  const tx = await source.getTransaction(txHash);
  if (!tx?.blockNumber) {
    throw new Error('Transaction not found or not yet mined on Sepolia');
  }
  return tx.blockNumber;
}

/**
 * Check whether a source-chain height has been attested on Creditcoin.
 */
export async function isHeightAttested(
  blockNumber: number,
  chainKey: number = attestcoinConfig.sepoliaChainKey
): Promise<boolean> {
  try {
    const info = getChainInfoProvider();
    const latest = await info.getLatestAttestedHeightAndHash(chainKey);
    const attestedHeight = Number(latest?.height ?? 0);
    return attestedHeight >= blockNumber;
  } catch {
    return false;
  }
}

/**
 * Wait until Creditcoin has attested the block containing `txHash`.
 */
export async function waitForAttestation(
  txHash: string,
  chainKey: number = attestcoinConfig.sepoliaChainKey,
  maxWaitMs: number = attestcoinConfig.attestationWaitMs
): Promise<{ blockNumber: number }> {
  const blockNumber = await getSourceTxBlockNumber(txHash);
  const proofBuilder = getProofBuilder(chainKey);

  const waitPromise = proofBuilder.waitUntilHeightAttested(chainKey, blockNumber);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Attestation pending for Sepolia block ${blockNumber}. Retry in ~15–60s once Attestcoin attests the block.`
          )
        ),
      maxWaitMs
    );
  });

  await Promise.race([waitPromise, timeoutPromise]);
  return { blockNumber };
}

/**
 * Generate Merkle + continuity proofs for a source-chain transaction.
 */
export async function generateAttestcoinProof(
  txHash: string,
  chainKey: number = attestcoinConfig.sepoliaChainKey
): Promise<AttestcoinProofResult> {
  const proofBuilder = getProofBuilder(chainKey);
  const result = await proofBuilder.getProof(txHash);

  if (!result.success || !result.data) {
    throw new Error(`Proof generation failed: ${result.error || 'unknown error'}`);
  }

  const data = result.data as any;
  return {
    chainKey: Number(data.chainKey ?? chainKey),
    headerNumber: Number(data.headerNumber),
    txHash: String(data.txHash ?? txHash),
    txBytes: String(data.txBytes),
    merkleProof: data.merkleProof,
    continuityProof: data.continuityProof,
    cached: Boolean(data.cached),
  };
}

/**
 * View-call verification against BlockProver precompile (0x…0FD2).
 */
export async function verifyProofOnCreditcoin(
  proof: AttestcoinProofResult
): Promise<boolean> {
  const prover = getBlockProver();
  return Boolean(
    await prover.verifySingle(
      proof.chainKey,
      proof.headerNumber,
      proof.txBytes,
      proof.merkleProof as any,
      proof.continuityProof as any
    )
  );
}

/**
 * Submit on-chain verifyAndEmit so the Attestcoin proof is recorded on Creditcoin.
 * Uses CREDITCOIN_TREASURY_PRIVATE_KEY as the signing key.
 */
export async function emitProofOnCreditcoin(
  proof: AttestcoinProofResult
): Promise<string> {
  const privateKey = process.env.CREDITCOIN_TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('CREDITCOIN_TREASURY_PRIVATE_KEY required to emit Attestcoin proofs');
  }

  const provider = getCreditcoinProvider();
  const signer = new Wallet(
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
    provider
  );
  const prover = getBlockProver();

  const tx = await prover.verifyAndEmitSingle(
    signer as any,
    proof.chainKey,
    proof.headerNumber,
    proof.txBytes,
    proof.merkleProof as any,
    proof.continuityProof as any
  );

  // SDK may return a TransactionResponse or a hash string
  if (typeof tx === 'string') return tx;
  if (tx?.hash) {
    await tx.wait?.();
    return tx.hash as string;
  }
  throw new Error('verifyAndEmitSingle did not return a transaction hash');
}

/**
 * Full pipeline: wait → prove → verify (view) → optionally emit on-chain.
 */
export async function proveAndVerifyTransaction(
  txHash: string,
  options: {
    chainKey?: number;
    emitOnChain?: boolean;
    maxWaitMs?: number;
  } = {}
): Promise<ProveAndVerifyResult> {
  const chainKey = options.chainKey ?? attestcoinConfig.sepoliaChainKey;
  const { blockNumber } = await waitForAttestation(
    txHash,
    chainKey,
    options.maxWaitMs ?? attestcoinConfig.attestationWaitMs
  );

  const proof = await generateAttestcoinProof(txHash, chainKey);
  const verified = await verifyProofOnCreditcoin(proof);

  if (!verified) {
    throw new Error('Attestcoin BlockProver rejected the proof');
  }

  let emitTxHash: string | undefined;
  if (options.emitOnChain !== false) {
    try {
      emitTxHash = await emitProofOnCreditcoin(proof);
    } catch (err) {
      // Still allow credit if view-verify succeeded but emit fails (e.g. gas),
      // but surface the emit error to the caller via result.
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Attestcoin] verifyAndEmit failed:', message);
      throw new Error(
        `Proof verified off-chain but on-chain emit failed: ${message}`
      );
    }
  }

  return {
    verified: true,
    proof,
    emitTxHash,
    blockNumber,
    chainKey,
  };
}

export function getAttestcoinPrecompileAddresses() {
  return {
    blockProver: ATTESTCOIN_BLOCK_PROVER,
    chainInfo: ATTESTCOIN_CHAIN_INFO,
    sdkBlockProver: blockProver.BLOCK_PROVER_PRECOMPILE_ADDRESS,
    sdkChainInfo: chainInfo.CHAIN_INFO_PRECOMPILE_ADDRESS,
  };
}
