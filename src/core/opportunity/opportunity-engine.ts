import {
  Opportunity,
  OpportunityType,
  MarketSnapshot,
  MultiMarketSnapshot,
  PortfolioState,
  FragilityAssessment,
  DataSource
} from '../types';

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `opp_${idCounter}`;
}

export function generateOpportunities(
  market: MultiMarketSnapshot,
  portfolio: PortfolioState,
  fragility: FragilityAssessment
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Hold Current
  opportunities.push({
    id: generateId(),
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
    metadata: {
      source: 'DERIVED',
      reasoning: 'Baseline holding position'
    }
  } as Opportunity);

  // Generate for each asset in the market snapshot
  for (const [symbol, snapshot] of Object.entries(market.snapshots || {})) {
    // directional long
    const momentum = snapshot.vwap ? (snapshot.price - snapshot.vwap) / snapshot.vwap : 0.01;
    const expectedReturnLong = momentum > 0 ? momentum * 1.5 : 0.01;
    const expectedRisk = snapshot.volatility || 0.05;
    
    opportunities.push({
      id: generateId(),
      type: 'DIRECTIONAL_LONG',
      asset: symbol,
      expectedReturn: expectedReturnLong,
      expectedRisk: expectedRisk,
      executionCost: 0.0015, // 0.1% maker + 0.05% taker approx
      slippageCost: 0.001,
      liquidityScore: snapshot.liquidityDepth && snapshot.liquidityDepth > 1000000 ? 0.9 : 0.5,
      fragilityPenalty: fragility.score * 0.1,
      portfolioImpact: 0.05,
      concentrationPenalty: portfolio.assets && portfolio.assets[symbol] ? 0.02 : 0,
      opportunityScore: expectedReturnLong - 0.0015 - 0.001 - (fragility.score * 0.1) - (portfolio.assets && portfolio.assets[symbol] ? 0.02 : 0),
      confidence: 0.7,
      metadata: {
        source: 'DERIVED',
        reasoning: 'Momentum-based directional long'
      }
    } as Opportunity);

    // carry
    if (snapshot.fundingRate && snapshot.fundingRate > 0) {
       opportunities.push({
         id: generateId(),
         type: 'CARRY',
         asset: symbol,
         expectedReturn: snapshot.fundingRate * 365,
         expectedRisk: expectedRisk * 0.2,
         executionCost: 0.003,
         slippageCost: 0.002,
         liquidityScore: snapshot.liquidityDepth && snapshot.liquidityDepth > 1000000 ? 0.9 : 0.5,
         fragilityPenalty: fragility.score * 0.05,
         portfolioImpact: 0.02,
         concentrationPenalty: portfolio.assets && portfolio.assets[symbol] ? 0.01 : 0,
         opportunityScore: (snapshot.fundingRate * 365) - 0.003 - 0.002 - (fragility.score * 0.05) - (portfolio.assets && portfolio.assets[symbol] ? 0.01 : 0),
         confidence: 0.8,
         metadata: {
            source: 'DERIVED',
            reasoning: 'Funding rate carry'
         }
       } as Opportunity);
    }
    
    // defensive / cash
    opportunities.push({
      id: generateId(),
      type: 'DEFENSIVE',
      asset: 'USDT',
      expectedReturn: 0.02, // risk free rate approx
      expectedRisk: 0.01,
      executionCost: 0.0005,
      slippageCost: 0,
      liquidityScore: 1.0,
      fragilityPenalty: 0,
      portfolioImpact: 0,
      concentrationPenalty: 0,
      opportunityScore: 0.02 - 0.0005,
      confidence: 0.9,
      metadata: {
        source: 'DERIVED',
        reasoning: 'Defensive cash position'
      }
    } as Opportunity);
  }

  return opportunities;
}
