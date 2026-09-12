/**
 * Multi-provider market price feed
 *
 * Replaces expired Pyth Hermes feeds with:
 * CoinGecko → DexScreener → CoinMarketCap → GMGN → Axiom → Padre
 *
 * Order is configurable via PRICE_PROVIDER_ORDER.
 */

export const ASSET_META = {
  BTC: { coingeckoId: 'bitcoin', symbol: 'BTC', category: 'Crypto' as const },
  ETH: { coingeckoId: 'ethereum', symbol: 'ETH', category: 'Crypto' as const },
  SOL: { coingeckoId: 'solana', symbol: 'SOL', category: 'Crypto' as const },
  TRX: { coingeckoId: 'tron', symbol: 'TRX', category: 'Crypto' as const },
  XRP: { coingeckoId: 'ripple', symbol: 'XRP', category: 'Crypto' as const },
  DOGE: { coingeckoId: 'dogecoin', symbol: 'DOGE', category: 'Crypto' as const },
  ADA: { coingeckoId: 'cardano', symbol: 'ADA', category: 'Crypto' as const },
  BCH: { coingeckoId: 'bitcoin-cash', symbol: 'BCH', category: 'Crypto' as const },
  XLM: { coingeckoId: 'stellar', symbol: 'XLM', category: 'Crypto' as const },
  XTZ: { coingeckoId: 'tezos', symbol: 'XTZ', category: 'Crypto' as const },
  GOLD: { coingeckoId: 'pax-gold', symbol: 'GOLD', category: 'Metals' as const },
  SILVER: { coingeckoId: 'kinesis-silver', symbol: 'SILVER', category: 'Metals' as const },
  EUR: { coingeckoId: 'tether-eurt', symbol: 'EUR', category: 'Forex' as const, fxFrom: 'EUR' },
  GBP: { coingeckoId: 'tether', symbol: 'GBP', category: 'Forex' as const, fxFrom: 'GBP' },
  JPY: { coingeckoId: 'tether', symbol: 'JPY', category: 'Forex' as const, fxFrom: 'JPY' },
  AUD: { coingeckoId: 'tether', symbol: 'AUD', category: 'Forex' as const, fxFrom: 'AUD' },
  CAD: { coingeckoId: 'tether', symbol: 'CAD', category: 'Forex' as const, fxFrom: 'CAD' },
  AAPL: { coingeckoId: 'apple-tokenized-stock-xstock', symbol: 'AAPL', category: 'Stocks' as const },
  GOOGL: { coingeckoId: 'alphabet-tokenized-stock-xstock', symbol: 'GOOGL', category: 'Stocks' as const },
  AMZN: { coingeckoId: 'amazon-tokenized-stock-xstock', symbol: 'AMZN', category: 'Stocks' as const },
  MSFT: { coingeckoId: 'microsoft-tokenized-stock-xstock', symbol: 'MSFT', category: 'Stocks' as const },
  NVDA: { coingeckoId: 'nvidia-tokenized-stock-xstock', symbol: 'NVDA', category: 'Stocks' as const },
  TSLA: { coingeckoId: 'tesla-tokenized-stock-xstock', symbol: 'TSLA', category: 'Stocks' as const },
  META: { coingeckoId: 'meta-tokenized-stock-xstock', symbol: 'META', category: 'Stocks' as const },
  NFLX: { coingeckoId: 'netflix-tokenized-stock-xstock', symbol: 'NFLX', category: 'Stocks' as const },
} as const;

export type AssetType = keyof typeof ASSET_META;

/** @deprecated Kept for admin/UI compatibility — values are CoinGecko IDs, not Pyth feed IDs */
export const PRICE_FEED_IDS: Record<AssetType, string> = Object.fromEntries(
  (Object.keys(ASSET_META) as AssetType[]).map((k) => [k, ASSET_META[k].coingeckoId])
) as Record<AssetType, string>;

export type PriceProviderName =
  | 'coingecko'
  | 'dexscreener'
  | 'cmc'
  | 'gmgn'
  | 'axiom'
  | 'padre';

export interface PriceData {
  price: number;
  confidence: number;
  timestamp: number;
  expo: number;
  provider?: PriceProviderName;
}

const DEFAULT_PROVIDER_ORDER: PriceProviderName[] = [
  'coingecko',
  'dexscreener',
  'cmc',
  'gmgn',
  'axiom',
  'padre',
];

function getProviderOrder(): PriceProviderName[] {
  const raw =
    process.env.PRICE_PROVIDER_ORDER ||
    process.env.NEXT_PUBLIC_PRICE_PROVIDER_ORDER ||
    '';
  if (!raw.trim()) return DEFAULT_PROVIDER_ORDER;
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as PriceProviderName[];
  return parsed.length ? parsed : DEFAULT_PROVIDER_ORDER;
}

function env(name: string, fallback = ''): string {
  return (process.env[name] || process.env[`NEXT_PUBLIC_${name}`] || fallback).trim();
}

function coingeckoBase(): string {
  return env(
    'COINGECKO_API_BASE',
    'https://api.coingecko.com/api/v3'
  ).replace(/\/$/, '');
}

function dexscreenerBase(): string {
  return env('DEXSCREENER_API_BASE', 'https://api.dexscreener.com').replace(/\/$/, '');
}

function cmcBase(): string {
  return env('CMC_API_BASE', 'https://pro-api.coinmarketcap.com').replace(/\/$/, '');
}

function gmgnBase(): string {
  return env('GMGN_API_BASE', 'https://gmgn.ai').replace(/\/$/, '');
}

function axiomBase(): string {
  return env('AXIOM_API_BASE', '').replace(/\/$/, '');
}

function padreBase(): string {
  return env('PADRE_API_BASE', '').replace(/\/$/, '');
}

function pollIntervalMs(): number {
  const n = Number(env('PRICE_POLL_INTERVAL_MS', '2000'));
  return Number.isFinite(n) && n >= 500 ? n : 2000;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function pickPrice(obj: any): number | null {
  if (obj == null) return null;
  const candidates = [
    obj.price,
    obj.priceUsd,
    obj.usd,
    obj.price_usd,
    obj.lastPrice,
    obj?.data?.price,
    obj?.data?.priceUsd,
    obj?.data?.usd,
    obj?.result?.price,
    obj?.token?.price,
    obj?.token?.price_usd,
  ];
  for (const c of candidates) {
    const n = typeof c === 'string' ? parseFloat(c) : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

async function fromCoinGecko(asset: AssetType): Promise<PriceData> {
  const meta = ASSET_META[asset];
  const key = env('COINGECKO_API_KEY') || env('COINGECKO_DEMO_API_KEY');
  const headers: Record<string, string> = {};
  if (key) {
    // Demo keys use x-cg-demo-api-key; pro uses x-cg-pro-api-key
    if (key.startsWith('CG-') || env('COINGECKO_API_BASE').includes('pro-api')) {
      headers['x-cg-pro-api-key'] = key;
    } else {
      headers['x-cg-demo-api-key'] = key;
    }
  }

  // Forex: frankfurter via padre-style free FX when marked
  if (meta.category === 'Forex' && 'fxFrom' in meta && meta.fxFrom) {
    const fx = await fetchJson(
      `https://api.frankfurter.app/latest?from=${meta.fxFrom}&to=USD`
    );
    const rate = Number(fx?.rates?.USD);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('FX rate missing');
    return {
      price: rate,
      confidence: 0,
      timestamp: Date.now() / 1000,
      expo: -8,
      provider: 'coingecko',
    };
  }

  const url = `${coingeckoBase()}/simple/price?ids=${encodeURIComponent(
    meta.coingeckoId
  )}&vs_currencies=usd`;
  const data = await fetchJson(url, { headers });
  const usd = Number(data?.[meta.coingeckoId]?.usd);
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`CoinGecko missing price for ${asset}`);
  }
  return {
    price: usd,
    confidence: 0,
    timestamp: Date.now() / 1000,
    expo: -8,
    provider: 'coingecko',
  };
}

async function fromDexScreener(asset: AssetType): Promise<PriceData> {
  const meta = ASSET_META[asset];
  if (meta.category === 'Forex') {
    throw new Error('DexScreener does not provide FX spot');
  }
  const q = encodeURIComponent(meta.symbol);
  const data = await fetchJson(`${dexscreenerBase()}/latest/dex/search?q=${q}`);
  const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];
  if (!pairs.length) throw new Error(`DexScreener: no pairs for ${asset}`);

  const symbolUpper = meta.symbol.toUpperCase();
  const ranked = pairs
    .filter((p) => {
      const base = String(p?.baseToken?.symbol || '').toUpperCase();
      const quote = String(p?.quoteToken?.symbol || '').toUpperCase();
      return base === symbolUpper || quote === symbolUpper || base.includes(symbolUpper);
    })
    .sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0));

  const best = ranked[0] || pairs[0];
  const price = pickPrice(best);
  if (!price) throw new Error(`DexScreener: invalid price for ${asset}`);
  return {
    price,
    confidence: 0,
    timestamp: Date.now() / 1000,
    expo: -8,
    provider: 'dexscreener',
  };
}

async function fromCmc(asset: AssetType): Promise<PriceData> {
  const apiKey = env('CMC_API_KEY') || env('COINMARKETCAP_API_KEY');
  if (!apiKey) throw new Error('CMC_API_KEY not configured');

  const meta = ASSET_META[asset];
  const url = `${cmcBase()}/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(
    meta.symbol
  )}`;
  const data = await fetchJson(url, {
    headers: { 'X-CMC_PRO_API_KEY': apiKey },
  });
  const entry = data?.data?.[meta.symbol];
  const quote = Array.isArray(entry) ? entry[0]?.quote?.USD?.price : entry?.quote?.USD?.price;
  const price = Number(quote);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`CMC missing price for ${asset}`);
  }
  return {
    price,
    confidence: 0,
    timestamp: Date.now() / 1000,
    expo: -8,
    provider: 'cmc',
  };
}

async function fromGmgn(asset: AssetType): Promise<PriceData> {
  const meta = ASSET_META[asset];
  // Optional per-asset mint/contract override: GMGN_TOKEN_BTC=So11... etc.
  const tokenAddress =
    env(`GMGN_TOKEN_${meta.symbol}`) ||
    env(`GMGN_TOKEN_ADDRESS_${meta.symbol}`);
  if (!tokenAddress) {
    throw new Error(`GMGN_TOKEN_${meta.symbol} not configured`);
  }
  const chain = env('GMGN_CHAIN', 'sol');
  const url = `${gmgnBase()}/defi/quotation/v1/tokens/${chain}/${tokenAddress}`;
  const data = await fetchJson(url);
  const price = pickPrice(data);
  if (!price) throw new Error(`GMGN missing price for ${asset}`);
  return {
    price,
    confidence: 0,
    timestamp: Date.now() / 1000,
    expo: -8,
    provider: 'gmgn',
  };
}

async function fromCustomTerminal(
  provider: 'axiom' | 'padre',
  asset: AssetType
): Promise<PriceData> {
  const base = provider === 'axiom' ? axiomBase() : padreBase();
  if (!base) throw new Error(`${provider.toUpperCase()}_API_BASE not configured`);

  const pathTemplate =
    provider === 'axiom'
      ? env('AXIOM_PRICE_PATH', '/api/price/{symbol}')
      : env('PADRE_PRICE_PATH', '/api/price/{symbol}');

  const path = pathTemplate.replace('{symbol}', ASSET_META[asset].symbol);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {};
  const key =
    provider === 'axiom' ? env('AXIOM_API_KEY') : env('PADRE_API_KEY');
  if (key) headers.Authorization = `Bearer ${key}`;

  const data = await fetchJson(url, { headers });
  const price = pickPrice(data);
  if (!price) throw new Error(`${provider} missing price for ${asset}`);
  return {
    price,
    confidence: 0,
    timestamp: Date.now() / 1000,
    expo: -8,
    provider,
  };
}

type ProviderFn = (asset: AssetType) => Promise<PriceData>;

const PROVIDERS: Record<PriceProviderName, ProviderFn> = {
  coingecko: fromCoinGecko,
  dexscreener: fromDexScreener,
  cmc: fromCmc,
  gmgn: fromGmgn,
  axiom: (a) => fromCustomTerminal('axiom', a),
  padre: (a) => fromCustomTerminal('padre', a),
};

/**
 * Fetch a single asset price, cascading providers until one succeeds.
 */
export async function fetchMarketPrice(asset: AssetType = 'BTC'): Promise<PriceData> {
  const order = getProviderOrder();
  const errors: string[] = [];

  for (const name of order) {
    const fn = PROVIDERS[name];
    if (!fn) continue;
    try {
      const data = await fn(asset);
      if (data.price > 0) return data;
      errors.push(`${name}: invalid price`);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `All price providers failed for ${asset}. Tried: ${errors.join(' | ')}`
  );
}

export class MarketPriceFeed {
  private intervalId: NodeJS.Timeout | null = null;
  private lastPrice: number | null = null;
  private isRunning = false;
  private asset: AssetType;

  constructor(asset: AssetType = 'BTC') {
    this.asset = asset;
  }

  async fetchPrice(): Promise<PriceData> {
    try {
      const data = await fetchMarketPrice(this.asset);
      this.lastPrice = data.price;
      return data;
    } catch (error) {
      console.error(`Error fetching ${this.asset} price:`, error);
      if (this.lastPrice !== null) {
        console.warn('Using last known price due to fetch error');
        return {
          price: this.lastPrice,
          confidence: 0,
          timestamp: Date.now() / 1000,
          expo: -8,
        };
      }
      throw error;
    }
  }

  setAsset(asset: AssetType): void {
    this.asset = asset;
    this.lastPrice = null;
  }

  getAsset(): AssetType {
    return this.asset;
  }

  async start(callback: (price: number, data: PriceData) => void): Promise<void> {
    if (this.isRunning) {
      console.warn('Price feed already running');
      return;
    }
    this.isRunning = true;

    try {
      const priceData = await this.fetchPrice();
      callback(priceData.price, priceData);
    } catch (error) {
      console.error('Failed to fetch initial price:', error);
    }

    this.intervalId = setInterval(async () => {
      try {
        const priceData = await this.fetchPrice();
        callback(priceData.price, priceData);
      } catch (error) {
        console.error('Failed to fetch price update:', error);
      }
    }, pollIntervalMs());
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  static async fetchAllPrices(): Promise<Record<AssetType, number>> {
    const symbols = Object.keys(ASSET_META) as AssetType[];
    const results = {} as Record<AssetType, number>;

    // Prefer batch CoinGecko for crypto ids, then fill gaps per-asset
    try {
      const cryptoIds = symbols
        .filter((s) => ASSET_META[s].category === 'Crypto' || ASSET_META[s].category === 'Metals')
        .map((s) => ASSET_META[s].coingeckoId);
      const uniqueIds = [...new Set(cryptoIds)];
      const key = env('COINGECKO_API_KEY') || env('COINGECKO_DEMO_API_KEY');
      const headers: Record<string, string> = {};
      if (key) {
        if (key.startsWith('CG-') || env('COINGECKO_API_BASE').includes('pro-api')) {
          headers['x-cg-pro-api-key'] = key;
        } else {
          headers['x-cg-demo-api-key'] = key;
        }
      }
      const url = `${coingeckoBase()}/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`;
      const data = await fetchJson(url, { headers });
      for (const s of symbols) {
        const id = ASSET_META[s].coingeckoId;
        const usd = Number(data?.[id]?.usd);
        if (Number.isFinite(usd) && usd > 0) results[s] = usd;
      }
    } catch (err) {
      console.error('Batch CoinGecko fetch failed:', err);
    }

    await Promise.all(
      symbols.map(async (s) => {
        if (results[s] != null) return;
        try {
          const d = await fetchMarketPrice(s);
          results[s] = d.price;
        } catch {
          /* leave missing */
        }
      })
    );

    return results;
  }

  getLastPrice(): number | null {
    return this.lastPrice;
  }
}

/** @deprecated Use MarketPriceFeed */
export const PythPriceFeed = MarketPriceFeed;

export const startMultiMarketPriceFeed = (
  callback: (prices: Record<AssetType, number>) => void
): (() => void) => {
  let intervalId: NodeJS.Timeout | null = null;
  let stopped = false;

  const update = async () => {
    try {
      // Prefer same-origin API when in browser (hides keys, avoids CORS)
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/price/latest', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.prices) {
            callback(json.prices);
            return;
          }
        }
      }
      const prices = await MarketPriceFeed.fetchAllPrices();
      if (!stopped) callback(prices);
    } catch (err) {
      console.error('Multi-price feed update failed:', err);
    }
  };

  update();
  intervalId = setInterval(update, pollIntervalMs());

  return () => {
    stopped = true;
    if (intervalId) clearInterval(intervalId);
  };
};

/** @deprecated Use startMultiMarketPriceFeed */
export const startMultiPythPriceFeed = startMultiMarketPriceFeed;

export const startMarketPriceFeed = (
  callback: (price: number, data: PriceData) => void,
  asset: AssetType = 'BTC'
): (() => void) => {
  const feed = new MarketPriceFeed(asset);
  feed.start(callback);
  return () => feed.stop();
};

/** @deprecated Use startMarketPriceFeed */
export const startPythPriceFeed = startMarketPriceFeed;

export const fetchPrice = async (asset: AssetType = 'BTC'): Promise<PriceData> => {
  return fetchMarketPrice(asset);
};

export const fetchBTCPrice = async (): Promise<PriceData> => fetchPrice('BTC');

export class MockPriceFeed {
  private basePrice: number;
  private volatility: number;
  private trend: number;
  private intervalId: NodeJS.Timeout | null = null;
  private asset: AssetType;

  constructor(
    asset: AssetType = 'BTC',
    basePrice?: number,
    volatility: number = 0.001,
    trend: number = 0
  ) {
    this.asset = asset;
    const defaults: Partial<Record<AssetType, number>> = { BTC: 50000 };
    this.basePrice = basePrice || defaults[asset] || 1;
    this.volatility = volatility;
    this.trend = trend;
  }

  setAsset(asset: AssetType): void {
    this.asset = asset;
  }

  getAsset(): AssetType {
    return this.asset;
  }

  private generateNextPrice(currentPrice: number): number {
    const randomChange = (Math.random() - 0.5) * 2;
    const change = currentPrice * this.volatility * randomChange + this.trend;
    return currentPrice + change;
  }

  start(callback: (price: number) => void): void {
    if (this.intervalId) return;
    let currentPrice = this.basePrice;
    callback(currentPrice);
    this.intervalId = setInterval(() => {
      currentPrice = this.generateNextPrice(currentPrice);
      callback(currentPrice);
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const startMockPriceFeed = (
  callback: (price: number) => void,
  options?: {
    asset?: AssetType;
    basePrice?: number;
    volatility?: number;
    trend?: number;
  }
): (() => void) => {
  const feed = new MockPriceFeed(
    options?.asset || 'BTC',
    options?.basePrice,
    options?.volatility,
    options?.trend
  );
  feed.start(callback);
  return () => feed.stop();
};
