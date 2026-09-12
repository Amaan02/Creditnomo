/**
 * GET /api/attestcoin/status?txHash=&userAddress=
 * Checks whether a Sepolia deposit is attested / already credited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAttestedDepositStatus } from '@/lib/attestcoin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const txHash = request.nextUrl.searchParams.get('txHash') || '';
    const userAddress = request.nextUrl.searchParams.get('userAddress') || '';

    if (!txHash || !userAddress) {
      return NextResponse.json(
        { success: false, error: 'txHash and userAddress are required' },
        { status: 400 }
      );
    }
    if (!ethers.isHexString(txHash, 32) && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash' },
        { status: 400 }
      );
    }
    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address' },
        { status: 400 }
      );
    }

    const status = await getAttestedDepositStatus(txHash, userAddress);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Attestcoin] status error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
