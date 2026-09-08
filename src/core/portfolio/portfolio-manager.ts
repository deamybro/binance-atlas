import { TradingAdapter } from '../execution/trading-adapter';
import { PortfolioState, Position, MultiMarketSnapshot, FragilityAssessment } from '../types';

export class PortfolioManager {
  constructor(private adapter: TradingAdapter) {}
  
  async getState(): Promise<PortfolioState> {
    const account = await this.adapter.getAccountState();
    const positions = await this.adapter.getPositions();
    
    const allocatedCapital = positions.reduce((sum, p) => sum + p.allocationUsd, 0);
    const atRiskCapital = positions.reduce((sum, p) => sum + Math.abs(p.unrealizedPnl < 0 ? p.unrealizedPnl : 0), 0);
    
    return {
      totalCapital: account.totalBalance,
      availableCapital: account.availableBalance,
      allocatedCapital,
      atRiskCapital,
      positions,
      timestamp: Date.now(),
    };
  }
  
  async updatePositionTheses(market: MultiMarketSnapshot, fragility: FragilityAssessment): Promise<Position[]> {
    const positions = await this.adapter.getPositions();
    const updatedPositions: Position[] = [];
    
    for (const position of positions) {
      const assetData = market.snapshots[position.symbol];
      if (!assetData) {
        updatedPositions.push(position);
        continue;
      }
      
      let thesisStatus = position.thesisStatus;
      let thesisReason = position.thesisReason;
      
      const currentPrice = assetData.price.value;
      
      if (position.direction === 'LONG' && currentPrice < position.entryPrice * 0.9) {
        thesisStatus = 'INVALIDATED';
        thesisReason = 'Price dropped more than 10% below entry';
      } else if (position.direction === 'SHORT' && currentPrice > position.entryPrice * 1.1) {
        thesisStatus = 'INVALIDATED';
        thesisReason = 'Price rose more than 10% above entry';
      } else if (fragility.score > 0.65 && thesisStatus === 'VALID') {
        thesisStatus = 'DETERIORATING';
        thesisReason = `Fragility increased to ${(fragility.score * 100).toFixed(0)}%`;
      }
      
      const updated: Position = {
        ...position,
        currentPrice,
        unrealizedPnl: position.direction === 'LONG' 
          ? (currentPrice - position.entryPrice) * position.size
          : (position.entryPrice - currentPrice) * position.size,
        unrealizedPnlPercent: position.direction === 'LONG'
          ? (currentPrice - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentPrice) / position.entryPrice,
        thesisStatus,
        thesisReason,
      };
      
      updatedPositions.push(updated);
    }
    
    return updatedPositions;
  }
  
  async calculateDailyLoss(): Promise<number> {
    const state = await this.getState();
    const totalPnl = state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    return totalPnl < 0 ? Math.abs(totalPnl) : 0;
  }
}
