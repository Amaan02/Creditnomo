/**
 * POST /api/attestcoin/deposit
 *
 * Cross-chain deposit credited via Attestcoin Protocol:
 * 1. Validate Sepolia ETH transfer to deposit address
 * 2. Wait for Attestcoin attestation of that block
 * 3. Build Merkle + continuity proofs (@gluwa/usc-sdk)
 * 4. verifyAndEmit on Creditcoin BlockProver precompile
 * 5. Credit CTC house balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { processAttestedDeposit, attestcoinConfig } from '@/lib/attestcoin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Allow enough time for attestation wait + proof + emit */
export const maxDuration = 300;

interface Body {
  userAddress: string;
  txHash: string;
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body: Body = await request.json();
    const { userAddress, txHash } = body;

    if (!userAddress || !txHash) {
      return NextResponse.json(
        { success: false, error: 'userAddress and txHash are required' },
        { status: 400 }
      );
    }
    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address' },
        { status: 400 }
      );
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Sepolia transaction hash' },
        { status: 400 }
      );
    }

    console.log(`[${timestamp}] [Attestcoin Deposit] Starting`, {
      userAddress,
      txHash,
      depositAddress: attestcoinConfig.sepoliaDepositAddress,
      rate: attestcoinConfig.ethToCtcRate,
    });

    const result = await processAttestedDeposit(userAddress, txHash);

    console.log(`[${timestamp}] [Attestcoin Deposit] Success`, {
      userAddress,
      creditedCtc: result.creditedCtc,
      emitTx: result.creditcoinEmitTxHash,
      alreadyProcessed: result.alreadyProcessed,
    });

    return NextResponse.json({
      ...result,
      success: true as const,
      depositAddress: attestcoinConfig.sepoliaDepositAddress,
      ethToCtcRate: attestcoinConfig.ethToCtcRate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] [Attestcoin Deposit] Error:`, message);

    const awaiting = /attestation pending|retry/i.test(message);
    return NextResponse.json(
      {
        success: false,
        error: message,
        awaitingAttestation: awaiting,
        hint: awaiting
          ? 'Attestcoin has not attested this Sepolia block yet. Poll /api/attestcoin/status and retry.'
          : undefined,
      },
      { status: awaiting ? 202 : 500 }
    );
  }
}
