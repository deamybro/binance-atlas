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
  const incrementalExpectedValue = proposed.expectedReturn - currentAllocation.expectedReturn;
  const advantage = incrementalExpectedValue 
    - proposed.executionCost 
    - proposed.slippageCost 
    - liquidityPenalty
    - proposed.portfolioImpact 
    - proposed.fragilityPenalty 
    - proposed.concentrationPenalty;

  return {
    currentExpectedValue: currentAllocation.expectedReturn,
    proposedExpectedValue: proposed.expectedReturn,
    incrementalExpectedValue,
    executionCost: proposed.executionCost,
    slippageCost: proposed.slippageCost,
    liquidityPenalty,
    portfolioRiskPenalty: proposed.portfolioImpact,
    fragilityPenalty: proposed.fragilityPenalty,
    concentrationPenalty: proposed.concentrationPenalty,
    finalAdvantage: advantage
  };
}

export function rankOpportunities(
  opportunities: Opportunity[],
  portfolio: PortfolioState,
  fragility: FragilityAssessment
): Opportunity[] {
  const holdOpp = opportunities.find(o => o.type === 'HOLD') || {
    id: 'hold_fallback',
    name: 'Hold Position',
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
    finalAdvantage: 0,
    confidence: 1,
    source: 'DERIVED'
  } as Opportunity;

  const ranked = opportunities.map(opp => {
    const analysis = calculateOpportunityCost(opp, holdOpp, portfolio, fragility);
    return {
      ...opp,
      finalAdvantage: analysis.finalAdvantage
    };
  });

  return ranked.sort((a, b) => b.finalAdvantage - a.finalAdvantage);
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
  
  if (analysis.finalAdvantage <= 0) {
    return null; // Doesn't beat HOLD
  }
  
  return { best, analysis };
}
