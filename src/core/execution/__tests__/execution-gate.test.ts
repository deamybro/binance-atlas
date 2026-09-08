import { describe, it, expect } from 'vitest';
import { createPendingExecution, buildOrderPreview, buildPostTradeProjection } from '../pending-execution';
import { AllocationProposal, RefereeDecision, PortfolioState, PolicyVersion } from '../../types';
import { DEFAULT_RISK_CONFIG } from '../../referee/risk-config';
import { computePolicyHash } from '../../referee/policy-registry';

describe('Execution Gate (Pending Executions)', () => {
  const mockPolicy: PolicyVersion = {
    version: 'v1.0',
    hash: computePolicyHash(DEFAULT_RISK_CONFIG),
    config: DEFAULT_RISK_CONFIG,
    timestamp: Date.now(),
    createdBy: 'SYSTEM_DEFAULT',
  };

  const mockPortfolio: PortfolioState = {
    totalCapital: 100000,
    availableCapital: 100000,
    allocatedCapital: 0,
    atRiskCapital: 0,
    positions: [],
    timestamp: Date.now(),
  };

  const mockProposal: AllocationProposal = {
    id: 'prop_test',
    asset: 'BTC',
    direction: 'LONG',
    allocationUsd: 15000,
    leverage: 2,
    expectedReturn: 0.08,
    expectedRisk: 0.04,
    rationale: 'High carry arbitrage opportunity',
    invalidationConditions: [],
    confidence: 0.85,
    opportunityCost: {
      currentExpectedValue: 0,
      proposedExpectedValue: 0.08,
      incrementalExpectedValue: 0.08,
      executionCost: 0.001,
      slippageCost: 0.001,
      liquidityPenalty: 0.001,
      portfolioRiskPenalty: 0.001,
      fragilityPenalty: 0.001,
      concentrationPenalty: 0.001,
      finalAdvantage: 0.074,
    },
    timestamp: Date.now(),
  };

  const mockRefereeDecision: RefereeDecision = {
    decision: 'ALLOW',
    requestedAllocation: 15000,
    approvedAllocation: 15000,
    rules: [],
    reason: 'Passes all preflight risk invariants',
    policyHash: mockPolicy.hash,
    timestamp: Date.now(),
  };

  it('builds an accurate order preview with estimated fees and slippage', () => {
    const preview = buildOrderPreview(10000, 60000);
    expect(preview.estimatedPrice).toBe(60000);
    expect(preview.estimatedFee).toBeCloseTo(4.0, 2); // 0.04%
    expect(preview.estimatedSlippage).toBeCloseTo(2.0, 2); // 0.02%
    expect(preview.estimatedTotal).toBeCloseTo(10006.0, 2);
  });

  it('projects post-trade capital, leverage, and liquidation distance', () => {
    const projection = buildPostTradeProjection(mockProposal, mockRefereeDecision, mockPortfolio, 60000);
    expect(projection.projectedAllocatedCapital).toBe(15000);
    expect(projection.projectedAvailableCapital).toBeLessThan(85000);
    expect(projection.projectedConcentration['BTC']).toBeCloseTo(0.15, 2);
    // Leverage 2x on BTC should have liquidation distance calculated
    expect(projection.projectedLiquidationDistance).toBeGreaterThan(40);
  });

  it('creates pending execution with PENDING status and TTL expiry', () => {
    const pending = createPendingExecution(mockProposal, mockRefereeDecision, mockPortfolio, 60000, mockPolicy, 60000);
    expect(pending.id).toContain('pex_');
    expect(pending.status).toBe('PENDING');
    expect(pending.expiresAt).toBeGreaterThan(pending.createdAt);
    expect(pending.policyVersion.hash).toBe(mockPolicy.hash);
  });
});
