/**
 * Market price feed tests (CoinGecko / DexScreener cascade)
 */

import { ASSET_META, fetchMarketPrice, PRICE_FEED_IDS } from '../priceFeed';

describe('Market price feed', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('exposes assets without Pyth feed IDs', () => {
    expect(ASSET_META.BTC.coingeckoId).toBe('bitcoin');
    expect(PRICE_FEED_IDS.BTC).toBe('bitcoin');
    expect(Object.keys(ASSET_META).length).toBeGreaterThan(10);
  });

  it('fetches BTC via CoinGecko when available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 70000 } }),
    }) as any;

    const data = await fetchMarketPrice('BTC');
    expect(data.price).toBe(70000);
    expect(data.provider).toBe('coingecko');
  });

  it('falls back to DexScreener when CoinGecko fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pairs: [
            {
              baseToken: { symbol: 'ETH' },
              priceUsd: '2500.5',
              liquidity: { usd: 1_000_000 },
            },
          ],
        }),
      }) as any;

    process.env.PRICE_PROVIDER_ORDER = 'coingecko,dexscreener';
    const data = await fetchMarketPrice('ETH');
    expect(data.price).toBe(2500.5);
    expect(data.provider).toBe('dexscreener');
    delete process.env.PRICE_PROVIDER_ORDER;
  });
});
