import { describe, it, expect } from 'vitest';
import { reconcileExecution } from '../reconciliation-engine';
import { OrderPreview, ExecutionResult } from '../../types';

describe('Post-Trade Reconciliation Engine', () => {
  const mockPreview: OrderPreview = {
    estimatedPrice: 60000,
    estimatedFee: 4,
    estimatedSlippage: 2,
    estimatedTotal: 10006, // 10000 notional + 4 fee + 2 slippage
  };

  it('classifies tight execution as MATCHED', () => {
    const mockExecution: ExecutionResult = {
      orderId: 'ord_1',
      symbol: 'BTCUSDT',
      side: 'BUY',
      executedPrice: 60050, // 0.083% slippage
      executedQuantity: 0.1667,
      fee: 4.10, // $0.10 fee delta
      slippage: 8.33,
      timestamp: Date.now(),
      mode: 'PAPER',
    };

    const res = reconcileExecution(mockPreview, 0.1667, mockExecution);
    expect(res.status).toBe('MATCHED');
    expect(res.priceSlippagePercent).toBeLessThan(0.25);
    expect(res.feeDelta).toBeCloseTo(0.10, 2);
    expect(res.details).toContain('MATCHED');
  });

  it('classifies moderate slippage as MINOR_DISCREPANCY', () => {
    const mockExecution: ExecutionResult = {
      orderId: 'ord_2',
      symbol: 'BTCUSDT',
      side: 'BUY',
      executedPrice: 60400, // ~0.667% slippage
      executedQuantity: 0.1667,
      fee: 10.00, // $6.00 fee delta
      slippage: 66.68,
      timestamp: Date.now(),
      mode: 'PAPER',
    };

    const res = reconcileExecution(mockPreview, 0.1667, mockExecution);
    expect(res.status).toBe('MINOR_DISCREPANCY');
    expect(res.priceSlippagePercent).toBeGreaterThan(0.25);
    expect(res.priceSlippagePercent).toBeLessThanOrEqual(1.0);
  });

  it('classifies extreme slippage or fee spike as MAJOR_DISCREPANCY', () => {
    const mockExecution: ExecutionResult = {
      orderId: 'ord_3',
      symbol: 'BTCUSDT',
      side: 'BUY',
      executedPrice: 63000, // 5% slippage
      executedQuantity: 0.1667,
      fee: 50.00,
      slippage: 500,
      timestamp: Date.now(),
      mode: 'LIVE',
    };

    const res = reconcileExecution(mockPreview, 0.1667, mockExecution);
    expect(res.status).toBe('MAJOR_DISCREPANCY');
    expect(res.totalCostDelta).toBeGreaterThan(0);
    expect(res.details).toContain('MAJOR_DISCREPANCY');
  });
});
