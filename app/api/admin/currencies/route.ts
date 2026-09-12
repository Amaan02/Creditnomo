import { NextRequest, NextResponse } from 'next/server';
import { ASSET_META, MarketPriceFeed, PRICE_FEED_IDS } from '@/lib/utils/priceFeed';

export async function GET(_request: NextRequest) {
  try {
    const cryptoTokens = ['BTC', 'ETH', 'SOL', 'TRX', 'XRP', 'DOGE', 'ADA', 'BCH', 'XLM', 'XTZ'];
    const stockTokens = ['AAPL', 'GOOGL', 'AMZN', 'MSFT', 'NVDA', 'TSLA', 'META', 'NFLX'];
    const commodityTokens = ['GOLD', 'SILVER'];
    const forexTokens = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

    const tokens = Object.entries(PRICE_FEED_IDS).map(([symbol, providerId]) => {
      let category = 'Other';
      if (cryptoTokens.includes(symbol)) category = 'Crypto';
      else if (stockTokens.includes(symbol)) category = 'Stocks';
      else if (commodityTokens.includes(symbol)) category = 'Commodities';
      else if (forexTokens.includes(symbol)) category = 'Forex';

      return {
        symbol,
        providerId,
        coingeckoId: ASSET_META[symbol as keyof typeof ASSET_META]?.coingeckoId,
        category,
      };
    });

    let currentPrices: Record<string, number> = {};
    try {
      currentPrices = await MarketPriceFeed.fetchAllPrices();
    } catch (err) {
      console.error('[admin/currencies] price fetch failed:', err);
    }

    return NextResponse.json({
      success: true,
      tokens,
      currentPrices,
      priceProviders:
        process.env.PRICE_PROVIDER_ORDER ||
        'coingecko,dexscreener,cmc,gmgn,axiom,padre',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
