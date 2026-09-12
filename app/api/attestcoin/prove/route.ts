/**
 * POST /api/attestcoin/prove
 * Prove + verify a Sepolia tx with Attestcoin (without crediting balance).
 * Useful for demos / judges verifying the integration independently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { proveAndVerifyTransaction, attestcoinConfig } from '@/lib/attestcoin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const txHash = body?.txHash as string;
    const emitOnChain = body?.emitOnChain !== false;

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { success: false, error: 'Valid Sepolia txHash required' },
        { status: 400 }
      );
    }

    const result = await proveAndVerifyTransaction(txHash, {
      chainKey: attestcoinConfig.sepoliaChainKey,
      emitOnChain,
    });

    return NextResponse.json({
      success: true,
      verified: result.verified,
      chainKey: result.chainKey,
      blockNumber: result.blockNumber,
      emitTxHash: result.emitTxHash,
      proof: {
        headerNumber: result.proof.headerNumber,
        txHash: result.proof.txHash,
        cached: result.proof.cached,
      },
      precompile: '0x0000000000000000000000000000000000000FD2',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const awaiting = /attestation pending|retry/i.test(message);
    return NextResponse.json(
      { success: false, error: message, awaitingAttestation: awaiting },
      { status: awaiting ? 202 : 500 }
    );
  }
}
