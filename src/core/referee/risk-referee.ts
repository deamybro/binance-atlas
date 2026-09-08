import {
  RefereeDecision,
  RefereeDecisionType,
  RuleEvaluation,
  RuleStatus,
  AllocationProposal,
  RiskConfig,
  PortfolioState,
  FragilityAssessment
} from '../types';
import { assessProposedLiquidationRisk } from './liquidation-engine';

export interface RefereeContext {
  currentPrice?: number; // current market price for the proposed asset
  policyHash?: string;   // SHA-256 hash of the governing policy version
}

export function evaluateProposal(
  proposal: AllocationProposal,
  portfolio: PortfolioState,
  fragility: FragilityAssessment,
  config: RiskConfig,
  dailyLossToday: number,
  context: RefereeContext = {}
): RefereeDecision {
  if (proposal.direction === 'HOLD' || proposal.allocationUsd === 0) {
    return {
      decision: 'ALLOW',
      requestedAllocation: proposal.allocationUsd,
      approvedAllocation: proposal.allocationUsd,
      rules: [],
      reason: 'HOLD proposals or zero allocations do not modify capital allocation and are automatically allowed.',
      policyHash: context.policyHash || 'NONE',
      timestamp: Date.now()
    };
  }

  const evaluations: RuleEvaluation[] = [];
  let allowedAllocationUsd = proposal.allocationUsd;

  const evaluate = (
    value: number,
    limit: number,
    rule: string,
    ruleLabel: string,
    isMin: boolean,
    impact: string
  ): RuleEvaluation => {
    let status: RuleStatus = 'PASS';
    if (isMin) {
      if (value < limit) status = 'FAIL';
      else if (limit > 0 && value <= limit * 1.25) status = 'WARNING';
    } else {
      if (value > limit) status = 'FAIL';
      else if (limit > 0 && value >= limit * 0.8) status = 'WARNING';
    }
    return { rule, ruleLabel, status, currentValue: value, limit, impact };
  };

  // 0. LIQUIDATION_DISTANCE — the headline check
  if (proposal.leverage > 1 && context.currentPrice && context.currentPrice > 0) {
    const direction = proposal.direction === 'SHORT' ? 'SHORT' : 'LONG';
    const liqEstimate = assessProposedLiquidationRisk(
      context.currentPrice, proposal.leverage, direction, proposal.asset, context.currentPrice
    );
    const minLiquidationDistance = 5; // 5% minimum distance to liquidation
    evaluations.push(
      evaluate(
        liqEstimate.distancePercent,
        minLiquidationDistance,
        'LIQUIDATION_DISTANCE',
        'Minimum Liquidation Distance',
        true,
        `Estimated liquidation at $${liqEstimate.liquidationPrice.toFixed(2)} is ${liqEstimate.distancePercent.toFixed(2)}% from current price. Classification: ${liqEstimate.classification}. ${liqEstimate.formula}`
      )
    );
  }

  // 1. MAX_LEVERAGE
  evaluations.push(
    evaluate(proposal.leverage, config.maxLeverage, 'MAX_LEVERAGE', 'Maximum Leverage Limit', false, 'Leverage exceeds the maximum permitted.')
  );

  // 2. MAX_ASSET_CONCENTRATION
  const currentAssetAlloc = portfolio.positions
    .filter(p => p.symbol === proposal.asset)
    .reduce((sum, p) => sum + p.allocationUsd, 0);
  const newAssetTotal = currentAssetAlloc + proposal.allocationUsd;
  const maxAssetAllowed = config.maxAssetConcentration * portfolio.totalCapital;
  evaluations.push(
    evaluate(newAssetTotal, maxAssetAllowed, 'MAX_ASSET_CONCENTRATION', 'Maximum Asset Concentration', false, 'Allocation would result in over-concentration in a single asset.')
  );
  if (newAssetTotal > maxAssetAllowed) {
    allowedAllocationUsd = Math.min(allowedAllocationUsd, maxAssetAllowed - currentAssetAlloc);
  }

  // 3. MAX_TOTAL_EXPOSURE
  const newTotalExp = portfolio.allocatedCapital + proposal.allocationUsd;
  const maxTotalExpAllowed = config.maxTotalExposure * portfolio.totalCapital;
  evaluations.push(
    evaluate(newTotalExp, maxTotalExpAllowed, 'MAX_TOTAL_EXPOSURE', 'Maximum Total Exposure', false, 'Total portfolio exposure exceeds maximum limit.')
  );
  if (newTotalExp > maxTotalExpAllowed) {
    allowedAllocationUsd = Math.min(allowedAllocationUsd, maxTotalExpAllowed - portfolio.allocatedCapital);
  }

  // 4. MAX_NET_EXPOSURE
  let netDirectionalExposure = portfolio.positions.reduce((sum, p) => {
    return sum + (p.direction === 'LONG' ? p.allocationUsd : -p.allocationUsd);
  }, 0);
  
  const exposureDelta = proposal.direction === 'LONG' ? proposal.allocationUsd : -proposal.allocationUsd;
  const newNetExp = netDirectionalExposure + exposureDelta;
  const maxNetExpAllowed = config.maxNetExposure * portfolio.totalCapital;
  evaluations.push(
    evaluate(Math.abs(newNetExp), maxNetExpAllowed, 'MAX_NET_EXPOSURE', 'Maximum Net Exposure', false, 'Net directional exposure exceeds permitted bounds.')
  );
  if (Math.abs(newNetExp) > maxNetExpAllowed) {
    if ((netDirectionalExposure > 0 && proposal.direction === 'LONG') || 
        (netDirectionalExposure < 0 && proposal.direction === 'SHORT')) {
      const headroom = maxNetExpAllowed - Math.abs(netDirectionalExposure);
      allowedAllocationUsd = Math.min(allowedAllocationUsd, headroom);
    } else if (netDirectionalExposure === 0) {
      allowedAllocationUsd = Math.min(allowedAllocationUsd, maxNetExpAllowed);
    }
  }

  // 5. MAX_TRADE_LOSS
  const tradeLoss = proposal.allocationUsd * proposal.expectedRisk;
  evaluations.push(
    evaluate(tradeLoss, config.maxTradeLoss, 'MAX_TRADE_LOSS', 'Maximum Trade Loss', false, 'Expected loss on trade exceeds limit.')
  );
  if (tradeLoss > config.maxTradeLoss) {
    allowedAllocationUsd = Math.min(allowedAllocationUsd, config.maxTradeLoss / proposal.expectedRisk);
  }

  // 6. DAILY_LOSS_LIMIT
  const totalDailyLoss = dailyLossToday + tradeLoss;
  evaluations.push(
    evaluate(totalDailyLoss, config.dailyLossLimit, 'DAILY_LOSS_LIMIT', 'Maximum Daily Loss', false, 'Trade would breach daily loss limit.')
  );
  if (totalDailyLoss > config.dailyLossLimit) {
    const dailyLossRoom = config.dailyLossLimit - dailyLossToday;
    allowedAllocationUsd = Math.min(allowedAllocationUsd, dailyLossRoom / proposal.expectedRisk);
  }

  // 7. MIN_LIQUIDITY (Skip on proposal since it's checked in opportunity stage)
  evaluations.push(
    evaluate(1, config.minimumLiquidity, 'MIN_LIQUIDITY', 'Minimum Liquidity', true, 'Asset liquidity is too low.')
  );

  // 8. MAX_SLIPPAGE (Skip on proposal since it's evaluated in opportunity stage)
  evaluations.push(
    evaluate(proposal.opportunityCost.slippageCost, config.maxSlippage, 'MAX_SLIPPAGE', 'Maximum Slippage', false, 'Estimated slippage exceeds maximum allowed.')
  );

  // 9. MAX_FRAGILITY
  evaluations.push(
    evaluate(fragility.score, config.maxFragilityScore, 'MAX_FRAGILITY', 'Maximum Fragility Exposure', false, 'Market fragility exceeds the permitted threshold.')
  );

  // 10. MIN_AVAILABLE_CAPITAL
  const newAvailableCap = portfolio.availableCapital - proposal.allocationUsd;
  const minAvailableCapReq = config.minAvailableCapital * portfolio.totalCapital;
  evaluations.push(
    evaluate(newAvailableCap, minAvailableCapReq, 'MIN_AVAILABLE_CAPITAL', 'Minimum Available Capital', true, 'Not enough capital would remain available.')
  );
  if (newAvailableCap < minAvailableCapReq) {
    const headroomCap = portfolio.availableCapital - minAvailableCapReq;
    allowedAllocationUsd = Math.min(allowedAllocationUsd, headroomCap);
  }

  allowedAllocationUsd = Math.max(0, allowedAllocationUsd);

  const failures = evaluations.filter(e => e.status === 'FAIL');
  
  const hasFatalFailures = failures.some(e => 
    ['LIQUIDATION_DISTANCE', 'MAX_LEVERAGE', 'MIN_LIQUIDITY', 'MAX_SLIPPAGE', 'MAX_FRAGILITY'].includes(e.rule)
  );

  let decision: RefereeDecisionType = 'ALLOW';
  let reason = 'All risk checks passed.';

  if (failures.length > 0) {
    if (!hasFatalFailures && allowedAllocationUsd > 0) {
      decision = 'RESIZE';
      reason = 'Proposal resized to comply with risk limits.';
    } else {
      decision = 'DENY';
      reason = 'Proposal denied due to risk limit violations.';
      allowedAllocationUsd = 0;
    }
  }

  return {
    decision,
    requestedAllocation: proposal.allocationUsd,
    approvedAllocation: allowedAllocationUsd,
    rules: evaluations,
    reason,
    policyHash: context.policyHash || 'NONE',
    timestamp: Date.now()
  };
}
