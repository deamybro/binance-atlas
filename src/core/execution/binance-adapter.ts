import crypto from 'crypto';
import { TradingAdapter } from './trading-adapter';
import { AccountState, Position, MarketSnapshot, OrderRequest, OrderPreview, ApprovedOrder, ExecutionResult } from '../types';
import { getBinanceMarketService } from '../market/binance-market-data';

export interface BinanceApiConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  futuresBaseUrl: string;
  useTestnet: boolean;
  timeoutMs: number;
}

const DEFAULT_BINANCE_CONFIG: BinanceApiConfig = {
  apiKey: process.env.BINANCE_API_KEY || '',
  apiSecret: process.env.BINANCE_API_SECRET || '',
  baseUrl: process.env.BINANCE_USE_TESTNET === 'true' 
    ? 'https://testnet.binance.vision' 
    : 'https://api.binance.com',
  futuresBaseUrl: process.env.BINANCE_USE_TESTNET === 'true'
    ? 'https://testnet.binancefuture.com'
    : 'https://fapi.binance.com',
  useTestnet: process.env.BINANCE_USE_TESTNET === 'true',
  timeoutMs: 10000,
};

export class BinanceAgentOSAdapter implements TradingAdapter {
  readonly mode = 'LIVE' as const;
  readonly name = 'Binance Live Agent OS';
  private config: BinanceApiConfig;
  private marketService = getBinanceMarketService();

  constructor(customConfig: Partial<BinanceApiConfig> = {}) {
    this.config = {
      ...DEFAULT_BINANCE_CONFIG,
      apiKey: customConfig.apiKey || process.env.BINANCE_API_KEY || '',
      apiSecret: customConfig.apiSecret || process.env.BINANCE_API_SECRET || '',
      ...customConfig,
    };
  }

  setCredentials(apiKey: string, apiSecret: string, useTestnet: boolean = false) {
    this.config.apiKey = apiKey;
    this.config.apiSecret = apiSecret;
    this.config.useTestnet = useTestnet;
    this.config.baseUrl = useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
    this.config.futuresBaseUrl = useTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey && this.config.apiSecret);
  }

  private signQuery(queryString: string): string {
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async makeSignedRequest(endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', params: Record<string, string | number> = {}): Promise<any> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Binance API Key or Secret is missing. Configure BINANCE_API_KEY and BINANCE_API_SECRET.');
    }

    const timestamp = Date.now();
    const queryObj: Record<string, string> = {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      timestamp: String(timestamp),
      recvWindow: '5000',
    };

    const queryString = new URLSearchParams(queryObj).toString();
    const signature = this.signQuery(queryString);
    const fullQuery = `${queryString}&signature=${signature}`;

    const url = method === 'GET' 
      ? `${this.config.baseUrl}${endpoint}?${fullQuery}`
      : `${this.config.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'X-MBX-APIKEY': this.config.apiKey,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      ...(method === 'POST' ? { body: fullQuery } : {}),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };

    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Binance API ${endpoint} failed (${res.status}): ${errorText}`);
    }

    return res.json();
  }

  /**
   * Fetches real Spot account balances and margins from Binance API.
   */
  async getAccountState(): Promise<AccountState> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      // Return public estimation if keys not yet supplied
      return {
        totalBalance: 100000,
        availableBalance: 100000,
        unrealizedPnl: 0,
        marginUsed: 0,
        mode: 'LIVE' as const,
      };
    }

    try {
      const accountData = await this.makeSignedRequest('/api/v3/account', 'GET');
      const balances: Array<{ asset: string; free: string; locked: string }> = accountData.balances || [];

      let totalUsdtValue = 0;
      let freeUsdtValue = 0;

      // Find USDT free
      const usdt = balances.find(b => b.asset === 'USDT');
      if (usdt) {
        freeUsdtValue = parseFloat(usdt.free);
        totalUsdtValue += freeUsdtValue + parseFloat(usdt.locked);
      }

      // Convert major holdings (BTC, ETH, BNB, SOL) to USD
      for (const b of balances) {
        const freeQty = parseFloat(b.free);
        const lockedQty = parseFloat(b.locked);
        const totalQty = freeQty + lockedQty;

        if (totalQty > 0 && b.asset !== 'USDT') {
          try {
            const priceSnap = await this.marketService.fetchSymbolSnapshot(b.asset);
            if (priceSnap) {
              const val = totalQty * priceSnap.price.value;
              totalUsdtValue += val;
            }
          } catch (e) {
            // ignore non-tradable dust
          }
        }
      }

      return {
        totalBalance: Math.max(totalUsdtValue, freeUsdtValue),
        availableBalance: freeUsdtValue,
        unrealizedPnl: 0,
        marginUsed: totalUsdtValue - freeUsdtValue,
        mode: 'LIVE' as const,
      };
    } catch (err: any) {
      console.warn('[BinanceLiveAdapter] getAccountState failed:', err.message);
      throw err;
    }
  }

  /**
   * Fetches active positions / holdings on Binance.
   */
  async getPositions(): Promise<Position[]> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      return [];
    }

    try {
      const accountData = await this.makeSignedRequest('/api/v3/account', 'GET');
      const balances: Array<{ asset: string; free: string; locked: string }> = accountData.balances || [];
      const positions: Position[] = [];

      for (const b of balances) {
        const freeQty = parseFloat(b.free);
        const lockedQty = parseFloat(b.locked);
        const totalQty = freeQty + lockedQty;

        if (totalQty > 0.0001 && ['BTC', 'ETH', 'SOL', 'BNB'].includes(b.asset)) {
          const snap = await this.marketService.fetchSymbolSnapshot(b.asset);
          const currentPrice = snap.price.value;
          const allocationUsd = totalQty * currentPrice;

          positions.push({
            id: `pos_binance_${b.asset.toLowerCase()}`,
            symbol: b.asset,
            direction: 'LONG',
            entryPrice: currentPrice, // Spot holding base price
            currentPrice,
            size: totalQty,
            allocationUsd,
            leverage: 1,
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
            openedAt: Date.now(),
            thesisStatus: 'VALID',
            thesisReason: 'Live Binance Spot holding',
            invalidationConditions: ['Fragility > 0.65', 'Price drops > 10%'],
          });
        }
      }

      return positions;
    } catch (err: any) {
      console.warn('[BinanceLiveAdapter] getPositions error:', err.message);
      return [];
    }
  }

  async getMarketData(symbol: string): Promise<MarketSnapshot | null> {
    return this.marketService.fetchSymbolSnapshot(symbol);
  }

  async previewOrder(order: OrderRequest): Promise<OrderPreview> {
    const snap = await this.marketService.fetchSymbolSnapshot(order.symbol);
    const estimatedPrice = snap.price.value;
    const fee = order.quantity * estimatedPrice * 0.001; // 0.1% spot fee
    const slippage = order.quantity * estimatedPrice * 0.0005; // 0.05% slippage
    const total = (order.quantity * estimatedPrice) + fee;

    return {
      estimatedPrice,
      estimatedFee: fee,
      estimatedSlippage: slippage,
      estimatedTotal: total,
    };
  }

  /**
   * Executes a real live order on Binance Spot.
   * REQUIRES approved order from the Deterministic Risk Referee.
   */
  async executeOrder(order: ApprovedOrder): Promise<ExecutionResult> {
    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('Cannot execute live order: Binance API credentials not configured in environment or settings.');
    }

    const symbol = `${order.symbol.toUpperCase()}USDT`;
    const side = order.side;
    const now = Date.now();

    try {
      // 1. Fetch current price to size quote quantity
      const snap = await this.marketService.fetchSymbolSnapshot(order.symbol);
      const currentPrice = snap.price.value;
      const quoteOrderQty = (order.approvedAllocation).toFixed(2);

      // 2. Execute Market Order on Binance
      const orderParams: Record<string, string | number> = {
        symbol,
        side,
        type: 'MARKET',
        quoteOrderQty: parseFloat(quoteOrderQty),
      };

      const result = await this.makeSignedRequest('/api/v3/order', 'POST', orderParams);

      const executedQty = parseFloat(result.executedQty || '0');
      const cummulativeQuoteQty = parseFloat(result.cummulativeQuoteQty || quoteOrderQty);
      const executedPrice = executedQty > 0 ? (cummulativeQuoteQty / executedQty) : currentPrice;
      const fee = cummulativeQuoteQty * 0.001;

      return {
        orderId: `binance_${result.orderId || Math.random().toString(16).slice(2, 10)}`,
        symbol: order.symbol,
        side: order.side,
        executedPrice,
        executedQuantity: executedQty > 0 ? executedQty : (order.approvedAllocation / currentPrice),
        fee,
        slippage: Math.abs(executedPrice - currentPrice),
        timestamp: now,
        mode: 'LIVE',
      };
    } catch (err: any) {
      console.error('[BinanceLiveAdapter] Live order execution error:', err.message);
      throw new Error(`Binance live execution failed: ${err.message}`);
    }
  }
}

let liveAdapterInstance: BinanceAgentOSAdapter | null = null;
export function getBinanceLiveAdapter(): BinanceAgentOSAdapter {
  if (!liveAdapterInstance) {
    liveAdapterInstance = new BinanceAgentOSAdapter();
  }
  return liveAdapterInstance;
}
