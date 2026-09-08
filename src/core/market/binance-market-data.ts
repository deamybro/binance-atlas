import { MarketSnapshot, MultiMarketSnapshot, MarketDataPoint, DataSource, DataFreshness, DataStatus } from '../types';

export interface BinanceMarketConfig {
  baseUrl: string;
  futuresBaseUrl: string;
  timeoutMs: number;
  staleThresholdMs: number;
  agingThresholdMs: number;
}

const DEFAULT_CONFIG: BinanceMarketConfig = {
  baseUrl: 'https://api.binance.com',
  futuresBaseUrl: 'https://fapi.binance.com',
  timeoutMs: 8000,
  staleThresholdMs: 30000,
  agingThresholdMs: 10000,
};

function computeFreshness(age: number, config: BinanceMarketConfig): DataFreshness {
  if (age > config.staleThresholdMs) return 'STALE';
  if (age > config.agingThresholdMs) return 'AGING';
  return 'FRESH';
}

function createPoint(value: number, source: DataSource, timestamp: number, config: BinanceMarketConfig = DEFAULT_CONFIG, status: DataStatus = 'AVAILABLE'): MarketDataPoint {
  const age = Math.max(0, Date.now() - timestamp);
  return {
    value,
    source,
    timestamp,
    age,
    freshness: computeFreshness(age, config),
    status,
  };
}

export class BinanceMarketDataService {
  private config: BinanceMarketConfig;
  private lastSnapshots: Record<string, MarketSnapshot> = {};

  constructor(config: Partial<BinanceMarketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetches real-time market data for a given crypto symbol (e.g. 'BTC', 'ETH')
   * using official Binance Spot & Futures public REST endpoints.
   */
  async fetchSymbolSnapshot(asset: string): Promise<MarketSnapshot> {
    const symbol = `${asset.toUpperCase()}USDT`;
    const now = Date.now();

    try {
      // 1. Fetch 24hr Ticker (Spot) - OBSERVED
      const tickerRes = await fetch(`${this.config.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`, {
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      if (!tickerRes.ok) throw new Error(`Binance ticker HTTP ${tickerRes.status}`);
      const ticker = await tickerRes.json();

      const price = parseFloat(ticker.lastPrice);
      const priceChange24h = parseFloat(ticker.priceChange);
      const priceChangePercent24h = parseFloat(ticker.priceChangePercent) / 100;
      const volume24h = parseFloat(ticker.quoteVolume);
      const high24h = parseFloat(ticker.highPrice);
      const low24h = parseFloat(ticker.lowPrice);

      // 2. Fetch Order Book Depth (Spot) - DERIVED liquidity depth
      let liquidityDepth = 25_000_000; // fallback depth
      try {
        const depthRes = await fetch(`${this.config.baseUrl}/api/v3/depth?symbol=${symbol}&limit=50`, {
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
        if (depthRes.ok) {
          const depth = await depthRes.json();
          const bidDepth = (depth.bids || []).reduce((acc: number, [p, q]: [string, string]) => acc + parseFloat(p) * parseFloat(q), 0);
          const askDepth = (depth.asks || []).reduce((acc: number, [p, q]: [string, string]) => acc + parseFloat(p) * parseFloat(q), 0);
          liquidityDepth = (bidDepth + askDepth) / 2;
        }
      } catch (e) {
        // Fallback to estimated depth from volume
        liquidityDepth = volume24h * 0.05;
      }

      // 3. Fetch K-Lines for realized volatility (Spot, 1h intervals, 24 periods) - DERIVED
      let volatility = 0.02; // baseline 2%
      try {
        const klinesRes = await fetch(`${this.config.baseUrl}/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`, {
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
        if (klinesRes.ok) {
          const klines = await klinesRes.json();
          const logReturns: number[] = [];
          for (let i = 1; i < klines.length; i++) {
            const prevClose = parseFloat(klines[i - 1][4]);
            const currClose = parseFloat(klines[i][4]);
            if (prevClose > 0 && currClose > 0) {
              logReturns.push(Math.log(currClose / prevClose));
            }
          }
          if (logReturns.length > 2) {
            const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
            const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (logReturns.length - 1);
            volatility = Math.sqrt(variance * 24); // daily annualized proxy
          }
        }
      } catch (e) {
        // fallback
        volatility = Math.abs(priceChangePercent24h) * 0.75 + 0.015;
      }

      // 4. Fetch Futures Funding Rate - OBSERVED / ESTIMATED
      let fundingRate = 0.0001; // default 0.01%
      try {
        const fundingRes = await fetch(`${this.config.futuresBaseUrl}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`, {
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
        if (fundingRes.ok) {
          const fundingData = await fundingRes.json();
          if (Array.isArray(fundingData) && fundingData.length > 0) {
            fundingRate = parseFloat(fundingData[0].fundingRate);
          }
        }
      } catch (e) {
        fundingRate = 0.0001;
      }

      // 5. Fetch Futures Open Interest - ESTIMATED
      let openInterest = 10_000_000_000;
      try {
        const oiRes = await fetch(`${this.config.futuresBaseUrl}/fapi/v1/openInterest?symbol=${symbol}`, {
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });
        if (oiRes.ok) {
          const oiData = await oiRes.json();
          const openInterestQty = parseFloat(oiData.openInterest);
          openInterest = openInterestQty * price;
        }
      } catch (e) {
        openInterest = asset === 'BTC' ? 12_000_000_000 : 5_000_000_000;
      }

      // 6. Estimated Liquidation Activity
      const liquidationActivity = (openInterest * volatility * 0.08);

      const snapshot: MarketSnapshot = {
        symbol: asset.toUpperCase(),
        price: createPoint(price, 'OBSERVED', now, this.config),
        priceChange24h: createPoint(priceChange24h, 'OBSERVED', now, this.config),
        priceChangePercent24h: createPoint(priceChangePercent24h, 'OBSERVED', now, this.config),
        volume24h: createPoint(volume24h, 'OBSERVED', now, this.config),
        high24h: createPoint(high24h, 'OBSERVED', now, this.config),
        low24h: createPoint(low24h, 'OBSERVED', now, this.config),
        volatility: createPoint(volatility, 'DERIVED', now, this.config),
        fundingRate: createPoint(fundingRate, 'OBSERVED', now, this.config),
        openInterest: createPoint(openInterest, 'ESTIMATED', now, this.config),
        liquidationActivity: createPoint(liquidationActivity, 'ESTIMATED', now, this.config),
        liquidityDepth: createPoint(liquidityDepth, 'DERIVED', now, this.config),
        timestamp: now,
        isStale: false,
      };

      this.lastSnapshots[asset] = snapshot;
      return snapshot;
    } catch (err) {
      console.warn(`[BinanceMarketData] Failed to fetch live data for ${asset}:`, err);
      // If we have cached snapshot, return it marked as stale if old
      if (this.lastSnapshots[asset]) {
        const cached = this.lastSnapshots[asset];
        const isStale = (now - cached.timestamp) > this.config.staleThresholdMs;
        return { ...cached, isStale };
      }
      throw err;
    }
  }

  /**
   * Fetches real market snapshots for tracked portfolio assets (BTC, ETH, SOL, BNB)
   */
  async fetchMultiMarketSnapshot(assets: string[] = ['BTC', 'ETH']): Promise<MultiMarketSnapshot> {
    const snapshots: Record<string, MarketSnapshot> = {};
    const now = Date.now();
    let hasStale = false;

    const promises = assets.map(async (asset) => {
      try {
        const snap = await this.fetchSymbolSnapshot(asset);
        snapshots[asset] = snap;
        if (snap.isStale) hasStale = true;
      } catch (e) {
        hasStale = true;
      }
    });

    await Promise.all(promises);

    return {
      snapshots,
      timestamp: now,
      isStale: hasStale || Object.keys(snapshots).length === 0,
    };
  }
}

let marketServiceInstance: BinanceMarketDataService | null = null;
export function getBinanceMarketService(): BinanceMarketDataService {
  if (!marketServiceInstance) {
    marketServiceInstance = new BinanceMarketDataService();
  }
  return marketServiceInstance;
}
