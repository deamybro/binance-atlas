import { MultiMarketSnapshot, MarketSnapshot, DemoScenario, MarketDataPoint } from '../types';

function makeDataPoint(value: number, source: 'OBSERVED' | 'DERIVED' | 'ESTIMATED' = 'OBSERVED'): MarketDataPoint {
  return { value, source, timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' };
}

function makeMarketSnapshot(
  symbol: string,
  price: number,
  changePercent24h: number,
  volatility: number,
  fundingRate: number,
  openInterest: number,
  liquidations: number,
  orderBookDepth: number,
): MarketSnapshot {
  const change24h = price * changePercent24h;
  return {
    symbol,
    timestamp: Date.now(),
    isStale: false,
    price: makeDataPoint(price),
    priceChange24h: makeDataPoint(change24h),
    priceChangePercent24h: makeDataPoint(changePercent24h),
    volume24h: makeDataPoint(price * 50000, 'OBSERVED'), // approximate volume
    high24h: makeDataPoint(changePercent24h > 0 ? price : price * (1 - changePercent24h)),
    low24h: makeDataPoint(changePercent24h < 0 ? price : price * (1 + changePercent24h)),
    volatility: makeDataPoint(volatility, 'DERIVED'),
    fundingRate: makeDataPoint(fundingRate),
    openInterest: makeDataPoint(openInterest),
    liquidationActivity: makeDataPoint(liquidations, 'ESTIMATED'),
    liquidityDepth: makeDataPoint(orderBookDepth, 'DERIVED'),
  };
}

function getNormalScenario(): MultiMarketSnapshot {
  return {
    snapshots: {
      BTC: makeMarketSnapshot('BTC', 67500, 0.012, 0.015, 0.0001, 1000000000, 5000000, 50000000),
      ETH: makeMarketSnapshot('ETH', 3450, 0.008, 0.02, 0.0001, 500000000, 2000000, 25000000),
    },
    timestamp: Date.now(),
    isStale: false,
  };
}

function getFragilitySpikeScenario(): MultiMarketSnapshot {
  return {
    snapshots: {
      BTC: makeMarketSnapshot('BTC', 65000, -0.035, 0.045, 0.0008, 1500000000, 25000000, 10000000),
      ETH: makeMarketSnapshot('ETH', 3200, -0.042, 0.055, 0.0009, 800000000, 15000000, 5000000),
    },
    timestamp: Date.now(),
    isStale: false,
  };
}

function getCascadeScenario(): MultiMarketSnapshot {
  return {
    snapshots: {
      BTC: makeMarketSnapshot('BTC', 58000, -0.12, 0.09, -0.0015, 500000000, 150000000, 2000000),
      ETH: makeMarketSnapshot('ETH', 2800, -0.15, 0.11, -0.0020, 250000000, 80000000, 1000000),
    },
    timestamp: Date.now(),
    isStale: false,
  };
}

function getExhaustionScenario(): MultiMarketSnapshot {
  return {
    snapshots: {
      BTC: makeMarketSnapshot('BTC', 56500, -0.02, 0.04, -0.0002, 450000000, 10000000, 15000000),
      ETH: makeMarketSnapshot('ETH', 2750, -0.015, 0.045, -0.0003, 230000000, 5000000, 8000000),
    },
    timestamp: Date.now(),
    isStale: false,
  };
}

function getRecoveryScenario(): MultiMarketSnapshot {
  return {
    snapshots: {
      BTC: makeMarketSnapshot('BTC', 59000, 0.03, 0.025, 0.00005, 550000000, 2000000, 30000000),
      ETH: makeMarketSnapshot('ETH', 2950, 0.04, 0.03, 0.00006, 300000000, 1000000, 15000000),
    },
    timestamp: Date.now(),
    isStale: false,
  };
}

export function getDemoMarketData(scenario: DemoScenario): MultiMarketSnapshot {
  switch (scenario) {
    case 'NORMAL': return getNormalScenario();
    case 'FRAGILITY_SPIKE': return getFragilitySpikeScenario();
    case 'CASCADE': return getCascadeScenario();
    case 'EXHAUSTION': return getExhaustionScenario();
    case 'RECOVERY': return getRecoveryScenario();
  }
}
