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
  });

  // Generate for each asset in the market snapshot
  for (const [symbol, snapshot] of Object.entries(market.snapshots || {})) {
    // directional long
    const price = snapshot.price?.value || 1;
    const change24h = snapshot.priceChangePercent24h?.value || 0;
    const momentum = change24h / 100;
    const expectedReturnLong = momentum > 0 ? momentum * 1.5 : 0.01;
    const expectedRisk = snapshot.volatility?.value || 0.05;
    
    const hasPosition = portfolio.positions.some(p => p.symbol === symbol);
    
    opportunities.push({
      id: generateId(),
      name: `Long ${symbol}`,
      type: 'DIRECTIONAL_LONG',
      asset: symbol,
      expectedReturn: expectedReturnLong,
      expectedRisk: expectedRisk,
      executionCost: 0.0015,
      slippageCost: 0.001,
      liquidityScore: snapshot.liquidityDepth?.value > 1000000 ? 0.9 : 0.5,
      fragilityPenalty: fragility.score * 0.1,
      portfolioImpact: 0.05,
      concentrationPenalty: hasPosition ? 0.02 : 0,
      opportunityScore: expectedReturnLong - 0.0015 - 0.001 - (fragility.score * 0.1) - (hasPosition ? 0.02 : 0),
      finalAdvantage: 0,
      confidence: 0.7,
      source: 'DERIVED'
    });

    // carry
    if (snapshot.fundingRate?.value > 0) {
       opportunities.push({
         id: generateId(),
         name: `Carry ${symbol}`,
         type: 'CARRY',
         asset: symbol,
         expectedReturn: snapshot.fundingRate.value * 365,
         expectedRisk: expectedRisk * 0.2,
         executionCost: 0.003,
         slippageCost: 0.002,
         liquidityScore: snapshot.liquidityDepth?.value > 1000000 ? 0.9 : 0.5,
         fragilityPenalty: fragility.score * 0.05,
         portfolioImpact: 0.02,
         concentrationPenalty: hasPosition ? 0.01 : 0,
         opportunityScore: (snapshot.fundingRate.value * 365) - 0.003 - 0.002 - (fragility.score * 0.05) - (hasPosition ? 0.01 : 0),
         finalAdvantage: 0,
         confidence: 0.8,
         source: 'DERIVED'
       });
    }
    
    // defensive / cash
    opportunities.push({
      id: generateId(),
      name: `Defensive ${symbol}`,
      type: 'DEFENSIVE',
      asset: 'USDT',
      expectedReturn: 0.02,
      expectedRisk: 0.01,
      executionCost: 0.0005,
      slippageCost: 0,
      liquidityScore: 1.0,
      fragilityPenalty: 0,
      portfolioImpact: 0,
      concentrationPenalty: 0,
      opportunityScore: 0.02 - 0.0005,
      finalAdvantage: 0,
      confidence: 0.9,
      source: 'DERIVED'
    });
  }

  return opportunities;
}
