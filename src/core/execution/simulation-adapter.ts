import { TradingAdapter } from './trading-adapter';
import { AccountState, Position, MarketSnapshot, OrderRequest, OrderPreview, ApprovedOrder, ExecutionResult, PortfolioState } from '../types';
import crypto from 'crypto';

export class SimulationAdapter implements TradingAdapter {
  readonly mode = 'PAPER' as const;
  readonly name = 'ATLAS Paper Trading';
  
  private balance: number;
  private positions: Map<string, Position>;
  private executionHistory: ExecutionResult[];
  private fees = { maker: 0.001, taker: 0.001 }; // 0.1%
  private slippageModel = 0.0005; // 0.05% base slippage
  private initialBalance: number;
  
  constructor(initialBalance: number = 100_000) {
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
    this.positions = new Map();
    this.executionHistory = [];
  }
  
  async getAccountState(): Promise<AccountState> {
    const activePositions = Array.from(this.positions.values());
    const totalUnrealizedPnL = activePositions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);
    return {
      balance: this.balance,
      equity: this.balance + totalUnrealizedPnL,
      unrealizedPnL: totalUnrealizedPnL,
      availableMargin: this.balance
    };
  }
  
  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }
  
  async getMarketData(symbol: string): Promise<MarketSnapshot | null> {
    return null;
  }
  
  async previewOrder(order: OrderRequest): Promise<OrderPreview> {
    const estimatedSlippage = order.price * this.slippageModel * (1 + Math.random() * 0.5);
    const executionPrice = order.side === 'BUY' ? order.price + estimatedSlippage : order.price - estimatedSlippage;
    const fee = executionPrice * order.quantity * this.fees.taker;
    const totalCost = (executionPrice * order.quantity) + fee;
    
    return {
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      estimatedPrice: executionPrice,
      estimatedFee: fee,
      estimatedTotal: totalCost
    };
  }
  
  async executeOrder(order: ApprovedOrder): Promise<ExecutionResult> {
    const marketPrice = 100; // Expected to be provided or mocked via prices in real use
    const executionPrice = marketPrice;
    const estimatedSlippage = executionPrice * this.slippageModel * (1 + (Math.random() * 0.5));
    const finalPrice = order.side === 'BUY' ? executionPrice + estimatedSlippage : executionPrice - estimatedSlippage;
    
    const fee = finalPrice * order.quantity * this.fees.taker;
    const cost = (finalPrice * order.quantity) + fee;
    
    if (this.balance < cost && order.side === 'BUY') {
      throw new Error('Insufficient balance');
    }
    
    if (order.side === 'BUY') {
      this.balance -= cost;
    } else {
      this.balance += cost;
    }
    
    const positionId = `pos_${crypto.randomBytes(4).toString('hex')}`;
    const orderId = `ord_${crypto.randomBytes(4).toString('hex')}`;
    
    const position: Position = {
      id: positionId,
      symbol: order.symbol,
      side: order.side === 'BUY' ? 'LONG' : 'SHORT',
      quantity: order.quantity,
      entryPrice: finalPrice,
      currentPrice: finalPrice,
      unrealizedPnL: 0,
      status: 'OPEN'
    };
    
    this.positions.set(positionId, position);
    
    const result: ExecutionResult = {
      orderId,
      status: 'FILLED',
      executedPrice: finalPrice,
      executedQuantity: order.quantity,
      fee,
      timestamp: Date.now()
    };
    
    this.executionHistory.push(result);
    return result;
  }
  
  async isAvailable(): Promise<boolean> {
    return true;
  }

  updatePositionPrices(prices: Record<string, number>) {
    for (const [posId, pos] of this.positions.entries()) {
      if (prices[pos.symbol]) {
        pos.currentPrice = prices[pos.symbol];
        const priceDiff = pos.currentPrice - pos.entryPrice;
        pos.unrealizedPnL = pos.side === 'LONG' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;
      }
    }
  }

  closePosition(positionId: string, currentPrice: number) {
    const pos = this.positions.get(positionId);
    if (!pos) return;
    
    const priceDiff = currentPrice - pos.entryPrice;
    const pnl = pos.side === 'LONG' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;
    
    this.balance += pnl;
    this.positions.delete(positionId);
  }

  getPortfolioState(): PortfolioState {
    const activePositions = Array.from(this.positions.values());
    const totalUnrealizedPnL = activePositions.reduce((sum, pos) => sum + (pos.unrealizedPnL || 0), 0);
    
    return {
      balance: this.balance,
      equity: this.balance + totalUnrealizedPnL,
      positions: activePositions,
      dailyPnL: totalUnrealizedPnL,
      timestamp: Date.now()
    };
  }

  reset() {
    this.balance = this.initialBalance;
    this.positions.clear();
    this.executionHistory = [];
  }
}
