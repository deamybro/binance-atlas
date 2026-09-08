import { describe, it, expect } from 'vitest';
import { detectMode } from '../mode-detector';

describe('Mode Detector', () => {
  const getContext = (overrides: any) => ({
    fragility: { level: 'LOW' },
    portfolio: { positions: [] },
    market: { snapshots: [] },
    previousMode: 'OPPORTUNITY',
    cascadeDetected: false,
    liquidationExhaustion: false,
    ...overrides
  });

  it('Normal conditions -> OPPORTUNITY', () => {
    const res = detectMode(getContext({}));
    expect(res.mode).toBe('OPPORTUNITY');
  });

  it('High fragility + positions -> DEFENSE', () => {
    const res = detectMode(getContext({
      fragility: { level: 'HIGH' },
      portfolio: { positions: [{ id: 'pos1' }] }
    }));
    expect(res.mode).toBe('DEFENSE');
  });

  it('Cascade detected -> HUNT', () => {
    const res = detectMode(getContext({
      cascadeDetected: true
    }));
    expect(res.mode).toBe('HUNT');
  });

  it('Liquidation exhaustion -> HUNT (ready)', () => {
    const res = detectMode(getContext({
      cascadeDetected: true,
      liquidationExhaustion: true
    }));
    expect(res.mode).toBe('HUNT');
  });

  it('Previous HUNT + improving -> RECOVERY', () => {
    const res = detectMode(getContext({
      previousMode: 'HUNT',
      fragility: { level: 'LOW' }
    }));
    expect(res.mode).toBe('RECOVERY');
  });
});
