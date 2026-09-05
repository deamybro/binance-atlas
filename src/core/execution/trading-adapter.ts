import { AccountState, Position, MarketSnapshot, OrderRequest, OrderPreview, ApprovedOrder, ExecutionResult } from '../types';

export interface TradingAdapter {
  readonly mode: 'PAPER' | 'LIVE';
  readonly name: string;
  
  getAccountState(): Promise<AccountState>;
  getPositions(): Promise<Position[]>;
  getMarketData(symbol: string): Promise<MarketSnapshot | null>;
  previewOrder(order: OrderRequest): Promise<OrderPreview>;
  executeOrder(order: ApprovedOrder): Promise<ExecutionResult>;
  isAvailable(): Promise<boolean>;
}
