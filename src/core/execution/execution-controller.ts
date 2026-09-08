import { TradingAdapter } from './trading-adapter';
import { AllocationProposal, RefereeDecision, ApprovedOrder, ExecutionResult } from '../types';

export class ExecutionController {
  private adapter: TradingAdapter;
  
  constructor(adapter: TradingAdapter) {
    this.adapter = adapter;
  }
  
  async execute(
    proposal: AllocationProposal,
    refereeDecision: RefereeDecision,
    currentPrice: number
  ): Promise<ExecutionResult> {
    // INVARIANT: Must have referee approval
    if (refereeDecision.decision === 'DENY') {
      throw new Error('EXECUTION BLOCKED: Referee denied this proposal');
    }
    
    // Use approved allocation, not requested
    const order: ApprovedOrder = {
      symbol: proposal.asset,
      side: proposal.direction === 'SHORT' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: refereeDecision.approvedAllocation / currentPrice,
      proposalId: proposal.id,
      refereeDecisionId: `ref_${Date.now()}`,
      approvedAllocation: refereeDecision.approvedAllocation,
    };
    
    return this.adapter.executeOrder(order);
  }
}
