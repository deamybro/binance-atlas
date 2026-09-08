import { describe, it, expect } from 'vitest';
import { 
  computeIsolatedLiquidationPrice, 
  computeLiquidationDistance, 
  assessProposedLiquidationRisk,
  getMaintenanceMarginRate 
} from '../liquidation-engine';

describe('Liquidation Engine', () => {
  it('computes isolated LONG liquidation price accurately', () => {
    // Entry price $60,000, 10x leverage, 1% maintenance margin
    // Formula: entryPrice * (1 - 1/leverage + MMR) = 60000 * (1 - 0.1 + 0.01) = 60000 * 0.91 = 54600
    const liqPrice = computeIsolatedLiquidationPrice(60000, 10, 'LONG', 0.01);
    expect(liqPrice).toBeCloseTo(54600, 2);
  });

  it('computes isolated SHORT liquidation price accurately', () => {
    // Entry price $60,000, 10x leverage, 1% maintenance margin
    // Formula: entryPrice * (1 + 1/leverage - MMR) = 60000 * (1 + 0.1 - 0.01) = 60000 * 1.09 = 65400
    const liqPrice = computeIsolatedLiquidationPrice(60000, 10, 'SHORT', 0.01);
    expect(liqPrice).toBeCloseTo(65400, 2);
  });

  it('computes distance to liquidation correctly for LONG', () => {
    const currentPrice = 60000;
    const liqPrice = 54000;
    // (60000 - 54000) / 60000 * 100 = 10%
    const distance = computeLiquidationDistance(currentPrice, liqPrice, 'LONG');
    expect(distance).toBeCloseTo(10, 2);
  });

  it('computes distance to liquidation correctly for SHORT', () => {
    const currentPrice = 60000;
    const liqPrice = 66000;
    // (66000 - 60000) / 60000 * 100 = 10%
    const distance = computeLiquidationDistance(currentPrice, liqPrice, 'SHORT');
    expect(distance).toBeCloseTo(10, 2);
  });

  it('assesses proposed liquidation risk and classifies as ATLAS_ESTIMATE', () => {
    const assessment = assessProposedLiquidationRisk(60000, 5, 'LONG', 'BTC', 60000);
    expect(assessment.classification).toBe('ATLAS_ESTIMATE');
    expect(assessment.distancePercent).toBeGreaterThan(15);
    expect(assessment.liquidationPrice).toBeLessThan(60000);
    expect(assessment.formula).toContain('Isolated Margin Liquidation Formula');
  });

  it('detects high danger when leverage is extremely high', () => {
    // 50x leverage has ~2% margin
    const assessment = assessProposedLiquidationRisk(60000, 50, 'LONG', 'BTC', 60000);
    expect(assessment.distancePercent).toBeLessThan(3);
  });

  it('provides appropriate maintenance margin rate for major assets', () => {
    expect(getMaintenanceMarginRate('BTC')).toBe(0.004);
    expect(getMaintenanceMarginRate('ETH')).toBe(0.005);
    expect(getMaintenanceMarginRate('SOL')).toBe(0.006);
    expect(getMaintenanceMarginRate('UNKNOWN')).toBe(0.01);
  });
});
