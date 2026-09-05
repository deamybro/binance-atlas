import { RiskConfig } from '../types';

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxLeverage: 3,
  maxAssetConcentration: 0.35,
  maxTotalExposure: 0.80,
  maxNetExposure: 0.60,
  maxTradeLoss: 5000,
  dailyLossLimit: 10000,
  minimumLiquidity: 0.3,
  maxSlippage: 0.02,
  maxFragilityScore: 0.65,
  minAvailableCapital: 0.15,
  maxHuntAllocation: 0.05,
};
