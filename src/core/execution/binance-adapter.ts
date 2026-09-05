import { TradingAdapter } from './trading-adapter';
import { AccountState, Position, MarketSnapshot, OrderRequest, OrderPreview, ApprovedOrder, ExecutionResult } from '../types';

export class BinanceAgentOSAdapter implements TradingAdapter {
  readonly mode = 'LIVE' as const;
  readonly name = 'Binance Agent OS';
  
  async isAvailable(): Promise<boolean> {
    // Check if BINANCE_API_KEY and BINANCE_API_SECRET are configured
    // Return false if not available
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    if (!apiKey || !apiSecret) {
      return false; // Default: not available
    }
    return true;
  }
  
  private async checkAvailable() {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('Agent OS trading not configured');
    }
  }
  
  async getAccountState(): Promise<AccountState> {
    await this.checkAvailable();
    throw new Error('Not implemented');
  }
  
  async getPositions(): Promise<Position[]> {
    await this.checkAvailable();
    throw new Error('Not implemented');
  }
  
  async getMarketData(symbol: string): Promise<MarketSnapshot | null> {
    await this.checkAvailable();
    throw new Error('Not implemented');
  }
  
  async previewOrder(order: OrderRequest): Promise<OrderPreview> {
    await this.checkAvailable();
    throw new Error('Not implemented');
  }
  
  async executeOrder(order: ApprovedOrder): Promise<ExecutionResult> {
    await this.checkAvailable();
    throw new Error('Not implemented');
  }
}
