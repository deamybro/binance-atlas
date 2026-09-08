import { describe, it, expect } from 'vitest';
import { evaluateProposal } from '../risk-referee';
import { AllocationProposal, PortfolioState, FragilityAssessment, RiskConfig } from '../../types';

describe('Risk Referee', () => {
  const defaultConfig: RiskConfig = {
    maxLeverage: 3,
    maxAssetConcentration: 0.35,
    maxTotalExposure: 0.8,
    maxNetExposure: 0.6,
    maxTradeLoss: 5000,
    dailyLossLimit: 10000,
    minimumLiquidity: 0.3,
    maxSlippage: 0.02,
    maxFragilityScore: 0.65,
    minAvailableCapital: 0.15,
    maxHuntAllocation: 0.05
  };

  const defaultFragility: FragilityAssessment = {
    score: 0.1,
    level: 'LOW',
    trend: 'STABLE',
    components: [],
    previousScore: null,
    timestamp: Date.now()
  };

  const defaultPortfolio: PortfolioState = {
    totalCapital: 100000,
    availableCapital: 100000,
    allocatedCapital: 0,
    atRiskCapital: 0,
    positions: [],
    timestamp: Date.now()
  };

  const defaultProposal: AllocationProposal = {
    id: 'p1',
    asset: 'BTC',
    direction: 'LONG',
    allocationUsd: 10000,
    leverage: 1,
    expectedReturn: 0.05,
    expectedRisk: 0.1, // Trade loss = 10000 * 0.1 = 1000
    rationale: 'Test',
    invalidationConditions: [],
    confidence: 0.9,
    opportunityCost: {
      currentExpectedValue: 0,
      proposedExpectedValue: 0.05,
      incrementalExpectedValue: 0.05,
      executionCost: 0.001,
      slippageCost: 0.001,
      liquidityPenalty: 0.001,
      portfolioRiskPenalty: 0.001,
      fragilityPenalty: 0.001,
      concentrationPenalty: 0.001,
      finalAdvantage: 0.045
    },
    timestamp: Date.now()
  };

  it('ALLOW: Valid trade within all limits', () => {
    const res = evaluateProposal(defaultProposal, defaultPortfolio, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('ALLOW');
    expect(res.approvedAllocation).toBe(10000);
  });

  it('DENY: Excessive leverage', () => {
    const p = { ...defaultProposal, leverage: 10 };
    const res = evaluateProposal(p, defaultPortfolio, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('DENY');
    expect(res.approvedAllocation).toBe(0);
  });

  it('RESIZE: Excessive concentration', () => {
    // maxAssetConcentration is 0.35 * 100000 = 35000
    const p = { ...defaultProposal, allocationUsd: 50000 };
    const res = evaluateProposal(p, defaultPortfolio, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('RESIZE');
    expect(res.approvedAllocation).toBe(35000);
  });

  it('DENY: Excessive fragility', () => {
    const frag = { ...defaultFragility, score: 0.9, level: 'EXTREME' as const };
    const res = evaluateProposal(defaultProposal, defaultPortfolio, frag, defaultConfig, 0);
    expect(res.decision).toBe('DENY');
  });

  it('DENY: Excessive slippage', () => {
    const p: AllocationProposal = {
      ...defaultProposal,
      opportunityCost: {
        ...defaultProposal.opportunityCost,
        slippageCost: 0.1 // max is 0.02
      }
    };
    const res = evaluateProposal(p, defaultPortfolio, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('DENY');
  });

  it('RESIZE: Daily loss limit exceeded', () => {
    // max is 10000. dailyLossToday = 9500. trade loss = 1000. total = 10500.
    const res = evaluateProposal(defaultProposal, defaultPortfolio, defaultFragility, defaultConfig, 9500);
    expect(res.decision).toBe('RESIZE');
    expect(res.approvedAllocation).toBeCloseTo((10000 - 9500) / 0.1, 1); // room = 500, risk = 0.1, max = 5000
  });

  it('ALLOW: HOLD proposal', () => {
    const p = { ...defaultProposal, direction: 'HOLD' as const };
    const res = evaluateProposal(p, defaultPortfolio, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('ALLOW');
  });

  it('RESIZE: Available capital check', () => {
    // total 100k, min available 15k, current available 20k
    const port = { ...defaultPortfolio, availableCapital: 20000 };
    // try to allocate 10k -> remaining 10k < 15k (fails)
    // max allowed = 20k - 15k = 5k
    const p = { ...defaultProposal, allocationUsd: 10000 };
    const res = evaluateProposal(p, port, defaultFragility, defaultConfig, 0);
    expect(res.decision).toBe('RESIZE');
    expect(res.approvedAllocation).toBeCloseTo(5000, 1);
  });

  it('EVALUATES: Liquidation distance check on leveraged proposal', () => {
    const p = { ...defaultProposal, leverage: 2 };
    const res = evaluateProposal(p, defaultPortfolio, defaultFragility, defaultConfig, 0, {
      currentPrice: 60000,
      policyHash: 'test_hash_123',
    });
    expect(res.decision).toBe('ALLOW');
    const liqRule = res.rules.find(r => r.rule === 'LIQUIDATION_DISTANCE');
    expect(liqRule).toBeDefined();
    expect(liqRule?.status).toBe('PASS');
    expect(liqRule?.currentValue).toBeGreaterThan(40);
    expect(res.policyHash).toBe('test_hash_123');
  });
});
