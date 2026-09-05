import {
  FragilityAssessment,
  FragilityComponent,
  FragilityLevel,
  DataSource,
  MarketSnapshot,
  MultiMarketSnapshot,
} from '../types';

export interface FragilityWeights {
  openInterestStress: number;
  fundingStress: number;
  volatilityStress: number;
  liquidationStress: number;
  liquidityStress: number;
}

export const DEFAULT_FRAGILITY_WEIGHTS: FragilityWeights = {
  openInterestStress: 0.25,
  fundingStress: 0.20,
  volatilityStress: 0.25,
  liquidationStress: 0.20,
  liquidityStress: 0.10,
};

export interface FragilityBaselines {
  openInterest: number;
  volatility: number;
  liquidationActivity: number;
  liquidityDepth: number;
}

export const DEFAULT_BASELINES: FragilityBaselines = {
  openInterest: 15_000_000_000, // $15B BTC OI baseline
  volatility: 0.02, // 2% daily vol baseline
  liquidationActivity: 50_000_000, // $50M daily liquidation baseline
  liquidityDepth: 10_000_000, // $10M order book depth baseline
};

// Helper: Sigmoid-like function scaled to [0, 1] for x in [0, Infinity)
function scaleTo01(value: number, baseline: number, steepness = 1): number {
  if (baseline === 0) return 1;
  const ratio = value / baseline;
  // Use a simple rational function for smooth 0-1 mapping: x / (x + k)
  // If value = baseline (ratio = 1), result is 1 / (1 + steepness).
  // Adjust so that ratio = 1 maps to ~0.5.
  return ratio / (ratio + 1 / steepness);
}

export function normalizeOpenInterestStress(oi: number, baseline: number): number {
  return scaleTo01(oi, baseline, 1);
}

export function normalizeFundingStress(fundingRate: number): number {
  // Normal funding rate is around 0.01% (0.0001).
  // Extreme funding rates (e.g., > 0.1% or < -0.1%) cause stress.
  const absFunding = Math.abs(fundingRate);
  const baseline = 0.001; // 0.1% as baseline for high stress
  return scaleTo01(absFunding, baseline, 1);
}

export function normalizeVolatilityStress(volatility: number, baseline: number): number {
  return scaleTo01(volatility, baseline, 1);
}

export function normalizeLiquidationStress(liquidationActivity: number, baseline: number): number {
  return scaleTo01(liquidationActivity, baseline, 1);
}

export function normalizeLiquidityStress(liquidityDepth: number, baseline: number): number {
  // Lower liquidity = higher stress
  if (liquidityDepth === 0) return 1;
  const ratio = baseline / liquidityDepth;
  return ratio / (ratio + 1);
}

export function classifyFragility(score: number): FragilityLevel {
  if (score < 0.25) return 'LOW';
  if (score < 0.50) return 'MODERATE';
  if (score < 0.75) return 'HIGH';
  return 'EXTREME';
}

export function calculateFragility(
  marketSnapshots: Record<string, MarketSnapshot>,
  previousScore: number | null,
  weights?: Partial<FragilityWeights>,
  baselines?: Partial<FragilityBaselines>
): FragilityAssessment {
  const w = { ...DEFAULT_FRAGILITY_WEIGHTS, ...weights };
  const b = { ...DEFAULT_BASELINES, ...baselines };

  const symbols = Object.keys(marketSnapshots);
  if (symbols.length === 0) {
    throw new Error('No market snapshots provided');
  }

  let totalOiStress = 0;
  let totalFundingStress = 0;
  let totalVolStress = 0;
  let totalLiqStress = 0;
  let totalLiquidityStress = 0;

  for (const symbol of symbols) {
    const snap = marketSnapshots[symbol];
    totalOiStress += normalizeOpenInterestStress(snap.openInterest || 0, b.openInterest);
    totalFundingStress += normalizeFundingStress(snap.fundingRate || 0);
    totalVolStress += normalizeVolatilityStress(snap.volatility || 0, b.volatility);
    totalLiqStress += normalizeLiquidationStress(snap.liquidationVolume || 0, b.liquidationActivity);
    totalLiquidityStress += normalizeLiquidityStress(snap.liquidityDepth || 0, b.liquidityDepth);
  }

  const n = symbols.length;

  const avgOiStress = totalOiStress / n;
  const avgFundingStress = totalFundingStress / n;
  const avgVolStress = totalVolStress / n;
  const avgLiqStress = totalLiqStress / n;
  const avgLiquidityStress = totalLiquidityStress / n;

  // Note: Casts are needed if DataSource enum doesn't map directly from strings; assuming it is defined in types
  const oiComponent: FragilityComponent = {
    name: 'Open Interest Stress',
    weight: w.openInterestStress,
    value: avgOiStress,
    weightedValue: avgOiStress * w.openInterestStress,
    dataSource: 'BINANCE_FUTURES_API' as DataSource
  };

  const fundingComponent: FragilityComponent = {
    name: 'Funding Stress',
    weight: w.fundingStress,
    value: avgFundingStress,
    weightedValue: avgFundingStress * w.fundingStress,
    dataSource: 'BINANCE_FUTURES_API' as DataSource
  };

  const volComponent: FragilityComponent = {
    name: 'Volatility Stress',
    weight: w.volatilityStress,
    value: avgVolStress,
    weightedValue: avgVolStress * w.volatilityStress,
    dataSource: 'BINANCE_MARKET_DATA' as DataSource
  };

  const liqComponent: FragilityComponent = {
    name: 'Liquidation Stress',
    weight: w.liquidationStress,
    value: avgLiqStress,
    weightedValue: avgLiqStress * w.liquidationStress,
    dataSource: 'BINANCE_LIQUIDATIONS' as DataSource
  };

  const liquidityComponent: FragilityComponent = {
    name: 'Liquidity Stress',
    weight: w.liquidityStress,
    value: avgLiquidityStress,
    weightedValue: avgLiquidityStress * w.liquidityStress,
    dataSource: 'BINANCE_ORDER_BOOK' as DataSource
  };

  const components = [
    oiComponent,
    fundingComponent,
    volComponent,
    liqComponent,
    liquidityComponent
  ];

  let fragilityScore = components.reduce((sum, c) => sum + c.weightedValue, 0);

  // Normalize total score weights just in case they don't sum to 1
  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
  if (totalWeight > 0) {
    fragilityScore = fragilityScore / totalWeight;
  }

  // Cap at 1.0
  fragilityScore = Math.min(1.0, Math.max(0, fragilityScore));

  const level = classifyFragility(fragilityScore);

  let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
  if (previousScore !== null) {
    if (fragilityScore > previousScore + 0.05) trend = 'INCREASING';
    else if (fragilityScore < previousScore - 0.05) trend = 'DECREASING';
  }

  // Use Set to get unique datasources
  const dataSourcesSet = new Set(components.map(c => c.dataSource));

  return {
    score: fragilityScore,
    level,
    trend,
    components,
    timestamp: Date.now(),
    dataSources: Array.from(dataSourcesSet)
  };
}
