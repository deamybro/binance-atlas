import { describe, it, expect } from 'vitest';
import { calculateFragility } from '../fragility-engine';
import { MarketSnapshot } from '../../types';

describe('Fragility Engine', () => {
  const makePoint = (value: number) => ({
    value,
    source: 'OBSERVED' as const,
    timestamp: Date.now(),
    age: 0,
    freshness: 'FRESH' as const,
    status: 'AVAILABLE' as const,
  });

  const getSnapshots = (modifier: number): Record<string, MarketSnapshot> => ({
    BTC: {
      symbol: 'BTC',
      price: makePoint(60000),
      priceChange24h: makePoint(0),
      priceChangePercent24h: makePoint(0),
      volume24h: makePoint(1000000),
      high24h: makePoint(61000),
      low24h: makePoint(59000),
      openInterest: makePoint(15_000_000_000 * modifier),
      fundingRate: makePoint(0.0005 * modifier),
      volatility: makePoint(0.02 * modifier),
      liquidationActivity: makePoint(50_000_000 * modifier),
      liquidityDepth: makePoint(10_000_000 / Math.max(0.1, modifier)),
      timestamp: Date.now(),
      isStale: false
    }
  });

  it('Low fragility scenario', () => {
    const f = calculateFragility(getSnapshots(0.3), null);
    expect(f.score).toBeLessThan(0.25);
    expect(f.level).toBe('LOW');
  });

  it('Moderate fragility scenario', () => {
    const f = calculateFragility(getSnapshots(0.8), null);
    expect(f.score).toBeGreaterThanOrEqual(0.25);
    expect(f.score).toBeLessThan(0.50);
    expect(f.level).toBe('MODERATE');
  });

  it('High fragility scenario', () => {
    const f = calculateFragility(getSnapshots(3.5), null);
    expect(f.score).toBeGreaterThanOrEqual(0.50);
    expect(f.score).toBeLessThan(0.75);
    expect(f.level).toBe('HIGH');
  });

  it('Extreme fragility scenario', () => {
    const f = calculateFragility(getSnapshots(10), null);
    expect(f.score).toBeGreaterThanOrEqual(0.75);
    expect(f.level).toBe('EXTREME');
  });

  it('Trend detection', () => {
    const f1 = calculateFragility(getSnapshots(1.2), 0.1);
    expect(f1.trend).toBe('WORSENING');
    
    const f2 = calculateFragility(getSnapshots(1.2), 0.9);
    expect(f2.trend).toBe('IMPROVING');
    
    const f3 = calculateFragility(getSnapshots(1.2), f1.score);
    expect(f3.trend).toBe('STABLE');
  });
});
