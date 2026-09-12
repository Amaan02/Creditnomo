/**
 * Market price provider smoke test
 *
 * Usage: npx tsx scripts/test-oracle-integration.ts
 */

async function main() {
  const { fetchMarketPrice, MarketPriceFeed, ASSET_META } = await import(
    '../lib/utils/priceFeed'
  );

  console.log('=== Creditnomo market price smoke test ===\n');
  console.log(
    'Providers order:',
    process.env.PRICE_PROVIDER_ORDER ||
      'coingecko,dexscreener,cmc,gmgn,axiom,padre'
  );
  console.log('Assets:', Object.keys(ASSET_META).join(', '));
  console.log('');

  for (const asset of ['BTC', 'ETH', 'SOL'] as const) {
    try {
      const data = await fetchMarketPrice(asset);
      console.log(`✓ ${asset}: $${data.price} (via ${data.provider})`);
    } catch (err) {
      console.error(`✗ ${asset}:`, err instanceof Error ? err.message : err);
    }
  }

  try {
    const all = await MarketPriceFeed.fetchAllPrices();
    console.log('\nBatch prices keys:', Object.keys(all).length);
  } catch (err) {
    console.error('Batch fetch failed:', err);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
