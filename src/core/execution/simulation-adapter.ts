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
    const totalUnrealizedPnl = activePositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);
    const marginUsed = activePositions.reduce((sum, pos) => sum + (pos.allocationUsd || 0), 0);
    
    return {
      totalBalance: this.balance + totalUnrealizedPnl,
      availableBalance: this.balance - marginUsed,
      unrealizedPnl: totalUnrealizedPnl,
      marginUsed: marginUsed,
      mode: 'PAPER'
    };
  }
  
  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }
  
  async getMarketData(symbol: string): Promise<MarketSnapshot | null> {
    return null;
  }
  
  async previewOrder(order: OrderRequest): Promise<OrderPreview> {
    const price = order.price || 100;
    const estimatedSlippage = price * this.slippageModel * (1 + Math.random() * 0.5);
    const executionPrice = order.side === 'BUY' ? price + estimatedSlippage : price - estimatedSlippage;
    const fee = executionPrice * order.quantity * this.fees.taker;
    const totalCost = (executionPrice * order.quantity) + fee;
    
    return {
      estimatedPrice: executionPrice,
      estimatedFee: fee,
      estimatedSlippage: estimatedSlippage,
      estimatedTotal: totalCost
    };
  }
  
  async executeOrder(order: ApprovedOrder): Promise<ExecutionResult> {
    const marketPrice = order.price || 100; 
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
      direction: order.side === 'BUY' ? 'LONG' : 'SHORT',
      size: order.quantity,
      entryPrice: finalPrice,
      currentPrice: finalPrice,
      unrealizedPnl: 0,
      allocationUsd: finalPrice * order.quantity,
      leverage: 1,
      unrealizedPnlPercent: 0,
      openedAt: Date.now(),
      thesisStatus: 'VALID',
      thesisReason: 'Simulation',
      invalidationConditions: []
    };
    
    this.positions.set(positionId, position);
    
    const result: ExecutionResult = {
      orderId,
      symbol: order.symbol,
      side: order.side,
      executedPrice: finalPrice,
      executedQuantity: order.quantity,
      fee,
      slippage: estimatedSlippage,
      timestamp: Date.now(),
      mode: 'PAPER'
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
        pos.unrealizedPnl = pos.direction === 'LONG' ? priceDiff * pos.size : -priceDiff * pos.size;
        pos.unrealizedPnlPercent = pos.unrealizedPnl / pos.allocationUsd;
      }
    }
  }

  closePosition(positionId: string, currentPrice: number) {
    const pos = this.positions.get(positionId);
    if (!pos) return;
    
    const priceDiff = currentPrice - pos.entryPrice;
    const pnl = pos.direction === 'LONG' ? priceDiff * pos.size : -priceDiff * pos.size;
    
    this.balance += (pos.allocationUsd + pnl);
    this.positions.delete(positionId);
  }

  getPortfolioState(): PortfolioState {
    const activePositions = Array.from(this.positions.values());
    const totalUnrealizedPnl = activePositions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);
    const allocatedCapital = activePositions.reduce((sum, pos) => sum + (pos.allocationUsd || 0), 0);
    const totalCapital = this.balance + totalUnrealizedPnl + allocatedCapital;
    
    return {
      totalCapital,
      availableCapital: this.balance,
      allocatedCapital,
      atRiskCapital: allocatedCapital, // simplified
      positions: activePositions,
      timestamp: Date.now()
    };
  }

  reset() {
    this.balance = this.initialBalance;
    this.positions.clear();
    this.executionHistory = [];
  }
}
