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

export function evaluateProposal(
  proposal: AllocationProposal,
  portfolio: PortfolioState,
  fragility: FragilityAssessment,
  config: RiskConfig,
  dailyLossToday: number
): RefereeDecision {
  if (proposal.action === 'HOLD' || proposal.allocationUsd === 0) {
    return {
      type: 'ALLOW',
      proposal,
      evaluations: [],
      reason: 'HOLD proposals or zero allocations do not modify capital allocation and are automatically allowed.',
      approvedAllocationUsd: proposal.allocationUsd,
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

  // 1. MAX_LEVERAGE
  evaluations.push(
    evaluate(proposal.leverage, config.maxLeverage, 'MAX_LEVERAGE', 'Maximum Leverage Limit', false, 'Leverage exceeds the maximum permitted.')
  );

  // 2. MAX_ASSET_CONCENTRATION
  const currentAssetAlloc = portfolio.allocations?.[proposal.asset] || 0;
  const newAssetTotal = currentAssetAlloc + proposal.allocationUsd;
  const maxAssetAllowed = config.maxAssetConcentration * portfolio.totalCapital;
  evaluations.push(
    evaluate(newAssetTotal, maxAssetAllowed, 'MAX_ASSET_CONCENTRATION', 'Maximum Asset Concentration', false, 'Allocation would result in over-concentration in a single asset.')
  );
  if (newAssetTotal > maxAssetAllowed) {
    allowedAllocationUsd = Math.min(allowedAllocationUsd, maxAssetAllowed - currentAssetAlloc);
  }

  // 3. MAX_TOTAL_EXPOSURE
  const newTotalExp = portfolio.totalAllocated + proposal.allocationUsd;
  const maxTotalExpAllowed = config.maxTotalExposure * portfolio.totalCapital;
  evaluations.push(
    evaluate(newTotalExp, maxTotalExpAllowed, 'MAX_TOTAL_EXPOSURE', 'Maximum Total Exposure', false, 'Total portfolio exposure exceeds maximum limit.')
  );
  if (newTotalExp > maxTotalExpAllowed) {
    allowedAllocationUsd = Math.min(allowedAllocationUsd, maxTotalExpAllowed - portfolio.totalAllocated);
  }

  // 4. MAX_NET_EXPOSURE
  const exposureDelta = proposal.direction === 'LONG' ? proposal.allocationUsd : -proposal.allocationUsd;
  const newNetExp = portfolio.netDirectionalExposure + exposureDelta;
  const maxNetExpAllowed = config.maxNetExposure * portfolio.totalCapital;
  evaluations.push(
    evaluate(Math.abs(newNetExp), maxNetExpAllowed, 'MAX_NET_EXPOSURE', 'Maximum Net Exposure', false, 'Net directional exposure exceeds permitted bounds.')
  );
  if (Math.abs(newNetExp) > maxNetExpAllowed) {
    if ((portfolio.netDirectionalExposure > 0 && proposal.direction === 'LONG') || 
        (portfolio.netDirectionalExposure < 0 && proposal.direction === 'SHORT')) {
      const headroom = maxNetExpAllowed - Math.abs(portfolio.netDirectionalExposure);
      allowedAllocationUsd = Math.min(allowedAllocationUsd, headroom);
    } else if (portfolio.netDirectionalExposure === 0) {
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

  // 7. MIN_LIQUIDITY
  evaluations.push(
    evaluate(proposal.liquidityScore, config.minimumLiquidity, 'MIN_LIQUIDITY', 'Minimum Liquidity', true, 'Asset liquidity is too low.')
  );

  // 8. MAX_SLIPPAGE
  evaluations.push(
    evaluate(proposal.estimatedSlippage, config.maxSlippage, 'MAX_SLIPPAGE', 'Maximum Slippage', false, 'Estimated slippage exceeds maximum allowed.')
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
    ['MAX_LEVERAGE', 'MIN_LIQUIDITY', 'MAX_SLIPPAGE', 'MAX_FRAGILITY'].includes(e.rule)
  );

  let type: RefereeDecisionType = 'ALLOW';
  let reason = 'All risk checks passed.';

  if (failures.length > 0) {
    if (!hasFatalFailures && allowedAllocationUsd > 0) {
      type = 'RESIZE';
      reason = 'Proposal resized to comply with risk limits.';
    } else {
      type = 'DENY';
      reason = 'Proposal denied due to risk limit violations.';
      allowedAllocationUsd = 0;
    }
  }

  return {
    type,
    proposal,
    evaluations,
    reason,
    approvedAllocationUsd: allowedAllocationUsd,
  };
}
