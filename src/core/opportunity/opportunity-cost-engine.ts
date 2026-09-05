import {
  OpportunityCostAnalysis,
  Opportunity,
  PortfolioState,
  FragilityAssessment
} from '../types';

export function calculateOpportunityCost(
  proposed: Opportunity,
  currentAllocation: Opportunity,
  portfolio: PortfolioState,
  fragility: FragilityAssessment
): OpportunityCostAnalysis {
  const liquidityPenalty = (1 - proposed.liquidityScore) * 0.01;
  const advantage = proposed.expectedReturn 
    - currentAllocation.expectedReturn 
    - proposed.executionCost 
    - proposed.slippageCost 
    - liquidityPenalty
    - proposed.portfolioImpact 
    - proposed.fragilityPenalty 
    - proposed.concentrationPenalty;

  return {
    proposedId: proposed.id,
    baselineId: currentAllocation.id,
    advantage,
    costs: {
      execution: proposed.executionCost,
      slippage: proposed.slippageCost,
      liquidity: liquidityPenalty,
      portfolioRisk: proposed.portfolioImpact,
      fragility: proposed.fragilityPenalty,
      concentration: proposed.concentrationPenalty,
    },
    metadata: {
      source: 'DERIVED',
      reasoning: 'Deterministic opportunity cost calculation'
    }
  } as OpportunityCostAnalysis;
}

export function rankOpportunities(
  opportunities: Opportunity[],
  portfolio: PortfolioState,
  fragility: FragilityAssessment
): Opportunity[] {
  const holdOpp = opportunities.find(o => o.type === 'HOLD') || {
    id: 'hold_fallback',
    type: 'HOLD',
    asset: 'USD',
    expectedReturn: 0,
    expectedRisk: 0,
    executionCost: 0,
    slippageCost: 0,
    liquidityScore: 1,
    fragilityPenalty: 0,
    portfolioImpact: 0,
    concentrationPenalty: 0,
    opportunityScore: 0,
    confidence: 1,
    metadata: { source: 'DERIVED', reasoning: 'Fallback HOLD' }
  } as Opportunity;

  const ranked = opportunities.map(opp => {
    const analysis = calculateOpportunityCost(opp, holdOpp, portfolio, fragility);
    return {
      ...opp,
      opportunityScore: analysis.advantage
    };
  });

  return ranked.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function findBestOpportunity(
  opportunities: Opportunity[],
  portfolio: PortfolioState,
  fragility: FragilityAssessment
): { best: Opportunity; analysis: OpportunityCostAnalysis } | null {
  const ranked = rankOpportunities(opportunities, portfolio, fragility);
  
  if (ranked.length === 0) return null;
  
  const best = ranked[0];
  
  const holdOpp = opportunities.find(o => o.type === 'HOLD');
  if (!holdOpp) return null;
  
  const analysis = calculateOpportunityCost(best, holdOpp, portfolio, fragility);
  
  if (analysis.advantage <= 0) {
    return null; // Doesn't beat HOLD
  }
  
  return { best, analysis };
}
