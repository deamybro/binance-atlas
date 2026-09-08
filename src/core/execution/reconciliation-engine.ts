import { OrderPreview, ExecutionResult, ReconciliationResult } from '../types';

/**
 * Reconciles actual execution fills against pre-trade order previews.
 * Evaluates slippage, fee deltas, and fill quantity variances.
 */
export function reconcileExecution(
  preview: OrderPreview,
  expectedQuantity: number,
  execution: ExecutionResult
): ReconciliationResult {
  const priceDelta = execution.executedPrice - preview.estimatedPrice;
  const priceSlippagePercent = preview.estimatedPrice > 0
    ? (Math.abs(priceDelta) / preview.estimatedPrice) * 100
    : 0;

  const feeDelta = execution.fee - preview.estimatedFee;
  const quantityDelta = execution.executedQuantity - expectedQuantity;
  const actualTotalCost = (execution.executedPrice * execution.executedQuantity) + execution.fee;
  const totalCostDelta = actualTotalCost - preview.estimatedTotal;

  let status: 'MATCHED' | 'MINOR_DISCREPANCY' | 'MAJOR_DISCREPANCY';
  if (priceSlippagePercent <= 0.25 && Math.abs(feeDelta) <= 5 && Math.abs(quantityDelta) <= 0.0001) {
    status = 'MATCHED';
  } else if (priceSlippagePercent <= 1.0 && Math.abs(feeDelta) <= 25) {
    status = 'MINOR_DISCREPANCY';
  } else {
    status = 'MAJOR_DISCREPANCY';
  }

  const details = [
    `Execution ID: ${execution.orderId}`,
    `Price: Expected $${preview.estimatedPrice.toFixed(2)} | Actual $${execution.executedPrice.toFixed(2)} (Slippage: ${priceSlippagePercent.toFixed(3)}%)`,
    `Fee: Expected $${preview.estimatedFee.toFixed(2)} | Actual $${execution.fee.toFixed(2)} (Delta: $${feeDelta >= 0 ? '+' : ''}${feeDelta.toFixed(2)})`,
    `Quantity: Expected ${expectedQuantity.toFixed(4)} | Actual ${execution.executedQuantity.toFixed(4)}`,
    `Cost Variance: $${totalCostDelta >= 0 ? '+' : ''}${totalCostDelta.toFixed(2)}`,
    `Reconciliation Status: ${status}`
  ].join(' | ');

  return {
    orderId: execution.orderId,
    expectedPrice: preview.estimatedPrice,
    actualPrice: execution.executedPrice,
    priceDelta,
    priceSlippagePercent: Number(priceSlippagePercent.toFixed(3)),
    expectedFee: preview.estimatedFee,
    actualFee: execution.fee,
    feeDelta: Number(feeDelta.toFixed(2)),
    expectedQuantity,
    actualQuantity: execution.executedQuantity,
    quantityDelta: Number(quantityDelta.toFixed(4)),
    totalCostDelta: Number(totalCostDelta.toFixed(2)),
    status,
    details,
  };
}
