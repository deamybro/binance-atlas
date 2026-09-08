import { LiquidationEstimate, LiquidationClassification, Position } from '../types';

/**
 * Binance Maintenance Margin Rate tiers (USDT-M Futures).
 * Simplified — uses the first applicable tier.
 * Source: https://www.binance.com/en/futures/trading-rules/perpetual/leverage-margin
 */
const MAINTENANCE_MARGIN_RATES: Record<string, number> = {
  BTC: 0.004,   // 0.4% for positions up to 50 BTC
  ETH: 0.005,   // 0.5% for positions up to 500 ETH
  SOL: 0.006,   // 0.6%
  BNB: 0.005,   // 0.5%
  DEFAULT: 0.01, // 1% conservative default for unknown assets
};

export function getMaintenanceMarginRate(symbol: string): number {
  return MAINTENANCE_MARGIN_RATES[symbol.toUpperCase()] || MAINTENANCE_MARGIN_RATES.DEFAULT;
}

/**
 * Direct calculation of isolated liquidation price given explicit MMR.
 */
export function computeIsolatedLiquidationPrice(
  entryPrice: number,
  leverage: number,
  direction: 'LONG' | 'SHORT',
  mmr: number
): number {
  if (direction === 'LONG') {
    return entryPrice * (1 - (1 / leverage) + mmr);
  } else {
    return entryPrice * (1 + (1 / leverage) - mmr);
  }
}

/**
 * Computes the estimated liquidation price for an isolated margin futures position.
 *
 * Binance Isolated Margin Liquidation Formula (simplified):
 *   Long:  LiqPrice = EntryPrice * (1 - 1/Leverage + MMR)
 *   Short: LiqPrice = EntryPrice * (1 + 1/Leverage - MMR)
 *
 * Where MMR = Maintenance Margin Rate
 *
 * This is an ATLAS_ESTIMATE, not a BINANCE_REPORTED value.
 * Binance's actual liquidation price accounts for additional factors
 * (accumulated funding, fees, insurance fund contribution) that we cannot
 * fully replicate. The estimate is conservative (closer to entry than actual).
 */
export function computeLiquidationPrice(
  entryPrice: number,
  leverage: number,
  direction: 'LONG' | 'SHORT',
  symbol: string
): LiquidationEstimate {
  const mmr = getMaintenanceMarginRate(symbol);

  if (leverage <= 0 || entryPrice <= 0) {
    return {
      liquidationPrice: 0,
      currentPrice: entryPrice,
      distancePercent: 100,
      classification: 'UNAVAILABLE' as LiquidationClassification,
      formula: 'Invalid parameters: leverage and entry price must be positive',
      maintenanceMarginRate: mmr,
    };
  }

  // Spot positions (leverage = 1) effectively have no liquidation price
  if (leverage === 1) {
    return {
      liquidationPrice: 0,
      currentPrice: entryPrice,
      distancePercent: 100,
      classification: 'ATLAS_ESTIMATE' as LiquidationClassification,
      formula: 'Spot position (leverage=1): no liquidation price — loss capped at position value',
      maintenanceMarginRate: mmr,
    };
  }

  let liquidationPrice: number;
  let formula: string;

  if (direction === 'LONG') {
    // Long: price must fall to liquidation
    // LiqPrice = EntryPrice * (1 - 1/Leverage + MMR)
    liquidationPrice = computeIsolatedLiquidationPrice(entryPrice, leverage, 'LONG', mmr);
    formula = `LONG: Isolated Margin Liquidation Formula = ${entryPrice.toFixed(2)} × (1 - 1/${leverage} + ${mmr}) = ${liquidationPrice.toFixed(2)}`;
  } else {
    // Short: price must rise to liquidation
    // LiqPrice = EntryPrice * (1 + 1/Leverage - MMR)
    liquidationPrice = computeIsolatedLiquidationPrice(entryPrice, leverage, 'SHORT', mmr);
    formula = `SHORT: Isolated Margin Liquidation Formula = ${entryPrice.toFixed(2)} × (1 + 1/${leverage} - ${mmr}) = ${liquidationPrice.toFixed(2)}`;
  }

  // Ensure liquidation price doesn't go negative
  liquidationPrice = Math.max(0, liquidationPrice);

  return {
    liquidationPrice,
    currentPrice: entryPrice,
    distancePercent: 0, // Will be updated with current price
    classification: 'ATLAS_ESTIMATE' as LiquidationClassification,
    formula,
    maintenanceMarginRate: mmr,
  };
}

/**
 * Computes the distance from current price to liquidation price as a percentage.
 * Positive = safe (price is away from liquidation).
 * Negative = already past liquidation (should have been liquidated).
 */
export function computeLiquidationDistance(
  currentPrice: number,
  liquidationPrice: number,
  direction: 'LONG' | 'SHORT'
): number {
  if (liquidationPrice <= 0 || currentPrice <= 0) return 100; // No liquidation risk

  if (direction === 'LONG') {
    // For longs, liquidation is below current price
    return ((currentPrice - liquidationPrice) / currentPrice) * 100;
  } else {
    // For shorts, liquidation is above current price
    return ((liquidationPrice - currentPrice) / currentPrice) * 100;
  }
}

/**
 * Full liquidation assessment for a position, combining price computation and distance.
 */
export function assessLiquidationRisk(
  position: Position,
  currentPrice: number
): LiquidationEstimate {
  const estimate = computeLiquidationPrice(
    position.entryPrice,
    position.leverage,
    position.direction,
    position.symbol
  );

  estimate.currentPrice = currentPrice;
  estimate.distancePercent = computeLiquidationDistance(
    currentPrice,
    estimate.liquidationPrice,
    position.direction
  );

  return estimate;
}

/**
 * Computes projected liquidation distance for a PROPOSED position.
 * This is used in preflight to check whether a new position would
 * have acceptable distance from liquidation.
 */
export function assessProposedLiquidationRisk(
  entryPrice: number,
  leverage: number,
  direction: 'LONG' | 'SHORT',
  symbol: string,
  currentPrice: number
): LiquidationEstimate {
  const estimate = computeLiquidationPrice(entryPrice, leverage, direction, symbol);
  estimate.currentPrice = currentPrice;
  estimate.distancePercent = computeLiquidationDistance(
    currentPrice,
    estimate.liquidationPrice,
    direction
  );
  return estimate;
}
