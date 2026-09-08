import crypto from 'crypto';
import { RiskConfig, PolicyVersion } from '../types';
import { DEFAULT_RISK_CONFIG } from './risk-config';

/**
 * Computes a deterministic SHA-256 hash of a risk config.
 * The config is serialized with sorted keys to ensure deterministic output.
 */
export function computePolicyHash(config: RiskConfig): string {
  const serialized = JSON.stringify(config, Object.keys(config).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Policy Registry — maintains a versioned, hash-linked history of all
 * risk policy configurations. Every referee decision records which
 * policy version governed it.
 */
export class PolicyRegistry {
  private versions: PolicyVersion[] = [];
  private currentVersion: PolicyVersion;

  constructor() {
    this.currentVersion = this.createVersion(DEFAULT_RISK_CONFIG, 'SYSTEM_DEFAULT');
  }

  private createVersion(config: RiskConfig, createdBy: 'OPERATOR' | 'SYSTEM_DEFAULT'): PolicyVersion {
    const hash = computePolicyHash(config);
    const versionNumber = this.versions.length + 1;
    const version: PolicyVersion = {
      version: `v${versionNumber}.0`,
      hash,
      config: { ...config },
      timestamp: Date.now(),
      createdBy,
    };
    this.versions.push(version);
    return version;
  }

  /**
   * Updates the risk config — creates a new policy version with a new hash.
   */
  updateConfig(config: RiskConfig): PolicyVersion {
    const newHash = computePolicyHash(config);
    
    // Don't create a new version if the config hasn't actually changed
    if (newHash === this.currentVersion.hash) {
      return this.currentVersion;
    }

    this.currentVersion = this.createVersion(config, 'OPERATOR');
    return this.currentVersion;
  }

  getCurrentPolicy(): PolicyVersion {
    return this.currentVersion;
  }

  getCurrentHash(): string {
    return this.currentVersion.hash;
  }

  getCurrentConfig(): RiskConfig {
    return { ...this.currentVersion.config };
  }

  getVersionHistory(): PolicyVersion[] {
    return [...this.versions];
  }

  getVersionByHash(hash: string): PolicyVersion | undefined {
    return this.versions.find(v => v.hash === hash);
  }
}

let policyRegistryInstance: PolicyRegistry | null = null;
export function getPolicyRegistry(): PolicyRegistry {
  if (!policyRegistryInstance) {
    policyRegistryInstance = new PolicyRegistry();
  }
  return policyRegistryInstance;
}
