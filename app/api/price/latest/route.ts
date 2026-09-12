/**
 * GET /api/price/latest
 * Multi-provider market prices (CoinGecko / DexScreener / CMC / GMGN / Axiom / Padre)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ASSET_META,
  AssetType,
  MarketPriceFeed,
  fetchMarketPrice,
} from '@/lib/utils/priceFeed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const assetParam = request.nextUrl.searchParams.get('asset');

    if (assetParam) {
      const asset = assetParam.toUpperCase() as AssetType;
      if (!(asset in ASSET_META)) {
        return NextResponse.json(
          { success: false, error: `Unsupported asset: ${assetParam}` },
          { status: 400 }
        );
      }
      const data = await fetchMarketPrice(asset);
      return NextResponse.json({
        success: true,
        asset,
        price: data.price,
        provider: data.provider,
        timestamp: data.timestamp,
      });
    }

    const prices = await MarketPriceFeed.fetchAllPrices();
    return NextResponse.json({
      success: true,
      prices,
      providersOrder:
        process.env.PRICE_PROVIDER_ORDER ||
        'coingecko,dexscreener,cmc,gmgn,axiom,padre',
      updatedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Price API]', message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
