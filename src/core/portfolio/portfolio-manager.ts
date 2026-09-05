import { TradingAdapter } from '../execution/trading-adapter';
import { PortfolioState, Position, MultiMarketSnapshot, FragilityAssessment } from '../types';

export class PortfolioManager {
  constructor(private adapter: TradingAdapter) {}
  
  async getState(): Promise<PortfolioState> {
    const account = await this.adapter.getAccountState();
    const positions = await this.adapter.getPositions();
    
    return {
      balance: account.balance,
      equity: account.equity,
      positions: positions,
      dailyPnL: account.unrealizedPnL,
      timestamp: Date.now()
    };
  }
  
  async updatePositionTheses(market: MultiMarketSnapshot, fragility: FragilityAssessment): Promise<Position[]> {
    const positions = await this.adapter.getPositions();
    const updatedPositions: Position[] = [];
    
    for (const position of positions) {
      const assetData = market[position.symbol];
      if (!assetData) continue;
      
      let thesisStatus = position.thesisStatus || 'ACTIVE';
      
      if (position.side === 'LONG' && assetData.price < position.entryPrice * 0.9) {
          thesisStatus = 'INVALIDATED';
      }
      if (position.side === 'SHORT' && assetData.price > position.entryPrice * 1.1) {
          thesisStatus = 'INVALIDATED';
      }
      
      const updated: Position = {
        ...position,
        currentPrice: assetData.price,
        thesisStatus
      };
      
      updatedPositions.push(updated);
    }
    
    return updatedPositions;
  }
  
  async calculateDailyLoss(): Promise<number> {
    const state = await this.getState();
    return state.dailyPnL < 0 ? Math.abs(state.dailyPnL) : 0;
  }
}
