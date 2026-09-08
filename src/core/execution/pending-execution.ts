import { 
  AllocationProposal, 
  RefereeDecision, 
  PortfolioState, 
  PolicyVersion, 
  PendingExecution, 
  OrderPreview, 
  PostTradeProjection 
} from '../types';
import { assessProposedLiquidationRisk } from '../referee/liquidation-engine';

function generatePendingId(): string {
  return 'pex_' + Math.random().toString(16).substring(2, 10);
}

/**
 * Builds an OrderPreview calculating estimated costs and execution metrics.
 */
export function buildOrderPreview(
  allocationUsd: number,
  currentPrice: number,
  feeRate: number = 0.0004,
  slippageRate: number = 0.0002
): OrderPreview {
  const estimatedFee = allocationUsd * feeRate;
  const estimatedSlippage = allocationUsd * slippageRate;
  const estimatedTotal = allocationUsd + estimatedFee + estimatedSlippage;

  return {
    estimatedPrice: currentPrice,
    estimatedFee,
    estimatedSlippage,
    estimatedTotal,
  };
}

/**
 * Projects the post-trade portfolio balance, exposures, and liquidation distance.
 */
export function buildPostTradeProjection(
  proposal: AllocationProposal,
  refereeDecision: RefereeDecision,
  portfolio: PortfolioState,
  currentPrice: number
): PostTradeProjection {
  const approved = refereeDecision.approvedAllocation;
  const fee = approved * 0.0004;

  const projectedTotalCapital = portfolio.totalCapital - fee;
  const projectedAvailableCapital = Math.max(0, portfolio.availableCapital - approved - fee);
  const projectedAllocatedCapital = portfolio.allocatedCapital + approved;

  // Calculate projected leverage
  const totalNotional = portfolio.positions.reduce((sum, p) => sum + (p.size * p.currentPrice), 0) + (approved * proposal.leverage);
  const projectedLeverage = projectedTotalCapital > 0 ? totalNotional / projectedTotalCapital : 1;

  // Projected liquidation distance
  let projectedLiquidationDistance: number | null = null;
  if (proposal.leverage > 1 && currentPrice > 0) {
    const direction = proposal.direction === 'SHORT' ? 'SHORT' : 'LONG';
    const liqResult = assessProposedLiquidationRisk(
      currentPrice,
      proposal.leverage,
      direction,
      proposal.asset,
      currentPrice
    );
    projectedLiquidationDistance = liqResult.distancePercent;
  }

  // Projected asset concentration
  const projectedConcentration: Record<string, number> = {};
  for (const pos of portfolio.positions) {
    projectedConcentration[pos.symbol] = pos.allocationUsd / Math.max(1, projectedTotalCapital);
  }
  const currentAssetAlloc = (projectedConcentration[proposal.asset] || 0) * projectedTotalCapital;
  projectedConcentration[proposal.asset] = (currentAssetAlloc + approved) / Math.max(1, projectedTotalCapital);

  return {
    projectedTotalCapital,
    projectedAvailableCapital,
    projectedAllocatedCapital,
    projectedLeverage: Number(projectedLeverage.toFixed(2)),
    projectedNetExposure: Number((projectedAllocatedCapital / Math.max(1, projectedTotalCapital)).toFixed(4)),
    projectedLiquidationDistance,
    projectedConcentration,
  };
}

/**
 * Constructs a PendingExecution proposal requiring operator confirmation.
 */
export function createPendingExecution(
  proposal: AllocationProposal,
  refereeDecision: RefereeDecision,
  portfolio: PortfolioState,
  currentPrice: number,
  policyVersion: PolicyVersion,
  ttlMs: number = 300_000 // 5 minutes default
): PendingExecution {
  const now = Date.now();
  const orderPreview = buildOrderPreview(refereeDecision.approvedAllocation, currentPrice);
  const postTradeProjection = buildPostTradeProjection(proposal, refereeDecision, portfolio, currentPrice);

  return {
    id: generatePendingId(),
    proposal,
    refereeDecision,
    orderPreview,
    postTradeProjection,
    policyVersion,
    createdAt: now,
    expiresAt: now + ttlMs,
    status: 'PENDING',
  };
}
