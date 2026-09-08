import { describe, it, expect } from 'vitest';
import { PolicyRegistry, computePolicyHash } from '../policy-registry';
import { DEFAULT_RISK_CONFIG } from '../risk-config';

describe('Policy Registry & Versioning', () => {
  it('computes deterministic SHA-256 hash regardless of property insertion order', () => {
    const configA = { ...DEFAULT_RISK_CONFIG, maxLeverage: 3, maxFragilityScore: 0.6 };
    // Reverse insertion order
    const configB = {} as any;
    const keys = Object.keys(configA).reverse();
    for (const k of keys) {
      configB[k] = (configA as any)[k];
    }

    const hashA = computePolicyHash(configA);
    const hashB = computePolicyHash(configB);

    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64); // SHA-256 hex length
  });

  it('initializes with SYSTEM_DEFAULT v1.0 version', () => {
    const registry = new PolicyRegistry();
    const current = registry.getCurrentPolicy();

    expect(current.version).toBe('v1.0');
    expect(current.createdBy).toBe('SYSTEM_DEFAULT');
    expect(current.hash).toBe(computePolicyHash(DEFAULT_RISK_CONFIG));
    expect(current.config).toEqual(DEFAULT_RISK_CONFIG);
  });

  it('increments version and generates new hash when config changes', () => {
    const registry = new PolicyRegistry();
    const v1Hash = registry.getCurrentHash();

    const newConfig = { ...DEFAULT_RISK_CONFIG, maxLeverage: 2 };
    const v2 = registry.updateConfig(newConfig);

    expect(v2.version).toBe('v2.0');
    expect(v2.createdBy).toBe('OPERATOR');
    expect(v2.hash).not.toBe(v1Hash);
    expect(registry.getCurrentHash()).toBe(v2.hash);

    const history = registry.getVersionHistory();
    expect(history.length).toBe(2);
    expect(history[0].version).toBe('v1.0');
    expect(history[1].version).toBe('v2.0');
  });

  it('does not create duplicate version if config values are identical', () => {
    const registry = new PolicyRegistry();
    const v1 = registry.getCurrentPolicy();

    const sameConfig = { ...DEFAULT_RISK_CONFIG };
    const result = registry.updateConfig(sameConfig);

    expect(result.version).toBe('v1.0');
    expect(registry.getVersionHistory().length).toBe(1);
  });

  it('retrieves historic policy version by SHA-256 hash', () => {
    const registry = new PolicyRegistry();
    const v1Hash = registry.getCurrentHash();

    registry.updateConfig({ ...DEFAULT_RISK_CONFIG, maxLeverage: 5 });
    const fetched = registry.getVersionByHash(v1Hash);

    expect(fetched).toBeDefined();
    expect(fetched?.version).toBe('v1.0');
    expect(fetched?.config.maxLeverage).toBe(DEFAULT_RISK_CONFIG.maxLeverage);
  });
});
