import { describe, it, expect } from 'vitest';
import { calculateOpportunityCost, findBestOpportunity } from '../opportunity-cost-engine';
import { Opportunity } from '../../types';

describe('Opportunity Cost Engine', () => {
  const p = {} as any;
  const f = {} as any;

  const hold: Opportunity = {
    id: 'hold1',
    name: 'Hold Current',
    type: 'HOLD',
    asset: 'USD',
    expectedReturn: 0,
    expectedRisk: 0,
    executionCost: 0,
    slippageCost: 0,
    liquidityScore: 1,
    portfolioImpact: 0,
    fragilityPenalty: 0,
    concentrationPenalty: 0,
    opportunityScore: 0,
    finalAdvantage: 0,
    confidence: 1,
    source: 'ESTIMATED'
  };

  it('Better opportunity beats current allocation', () => {
    const opp: Opportunity = { ...hold, expectedReturn: 0.05, id: 'opp1' };
    const res = calculateOpportunityCost(opp, hold, p, f);
    expect(res.finalAdvantage).toBeGreaterThan(0);
  });

  it('Worse opportunity loses to current', () => {
    const opp: Opportunity = { ...hold, expectedReturn: -0.05, id: 'opp2' };
    const res = calculateOpportunityCost(opp, hold, p, f);
    expect(res.finalAdvantage).toBeLessThan(0);
  });

  it('Equal opportunity near zero advantage', () => {
    const opp: Opportunity = { ...hold, expectedReturn: 0, id: 'opp3' };
    const res = calculateOpportunityCost(opp, hold, p, f);
    expect(res.finalAdvantage).toBeCloseTo(0);
  });

  it('High execution cost negates return advantage', () => {
    const opp: Opportunity = { ...hold, expectedReturn: 0.05, executionCost: 0.06, id: 'opp4' };
    const res = calculateOpportunityCost(opp, hold, p, f);
    expect(res.finalAdvantage).toBeLessThan(0);
  });

  it('findBestOpportunity selects best that beats HOLD', () => {
    const opp1: Opportunity = { ...hold, expectedReturn: 0.01, id: 'opp1' };
    const opp2: Opportunity = { ...hold, expectedReturn: 0.1, id: 'opp2' };
    
    const res = findBestOpportunity([hold, opp1, opp2], p, f);
    expect(res).not.toBeNull();
    expect(res?.best.id).toBe('opp2');
    expect(res?.analysis.finalAdvantage).toBeGreaterThan(0);
  });
});
