/**
 * GET /api/attestcoin/chains
 * Lists Attestcoin-supported source chains on Creditcoin testnet.
 */

import { NextResponse } from 'next/server';
import {
  getSupportedAttestcoinChains,
  getAttestcoinPrecompileAddresses,
  attestcoinConfig,
} from '@/lib/attestcoin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chains = await getSupportedAttestcoinChains();
    return NextResponse.json({
      success: true,
      environment: 'cc3-testnet',
      proofBuilderUrl: attestcoinConfig.proofBuilderUrl,
      dashboardUrl: attestcoinConfig.dashboardUrl,
      sepoliaDepositAddress: attestcoinConfig.sepoliaDepositAddress,
      ethToCtcRate: attestcoinConfig.ethToCtcRate,
      precompiles: getAttestcoinPrecompileAddresses(),
      chains,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Attestcoin] chains error:', message);
    return NextResponse.json(
      {
        success: false,
        error: message,
        // Still return static config so the UI can render
        environment: 'cc3-testnet',
        proofBuilderUrl: attestcoinConfig.proofBuilderUrl,
        sepoliaDepositAddress: attestcoinConfig.sepoliaDepositAddress,
        ethToCtcRate: attestcoinConfig.ethToCtcRate,
        precompiles: getAttestcoinPrecompileAddresses(),
        chains: [
          {
            chainKey: attestcoinConfig.sepoliaChainKey,
            chainId: attestcoinConfig.sepoliaChainId,
            chainName: 'Ethereum Sepolia',
          },
        ],
      },
      { status: 200 }
    );
  }
}
