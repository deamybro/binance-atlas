import { MultiMarketSnapshot, MarketSnapshot, DemoScenario, MarketDataPoint } from '../types';

function makeDataPoint(value: number, source: 'OBSERVED' | 'DERIVED' | 'ESTIMATED' = 'OBSERVED'): MarketDataPoint {
  return { value, source, timestamp: Date.now(), age: 0 };
}

function makeMarketSnapshot(
  symbol: string,
  price: number,
  change24h: number,
  volatility: number,
  fundingRate: number,
  openInterest: number,
  liquidations: number,
  bidAskSpread: number,
  orderBookDepth: number,
): MarketSnapshot {
  return {
    symbol,
    timestamp: Date.now(),
    price: makeDataPoint(price),
    change24h: makeDataPoint(change24h),
    volatility: makeDataPoint(volatility, 'DERIVED'),
    fundingRate: makeDataPoint(fundingRate),
    openInterest: makeDataPoint(openInterest),
    liquidations: makeDataPoint(liquidations),
    liquidity: {
      bidAskSpread: makeDataPoint(bidAskSpread),
      orderBookDepth: makeDataPoint(orderBookDepth, 'ESTIMATED')
    }
  };
}

function getNormalScenario(): MultiMarketSnapshot {
  return {
    BTC: makeMarketSnapshot('BTC', 67500, 0.012, 0.015, 0.0001, 1000000000, 5000000, 0.0001, 50000000),
    ETH: makeMarketSnapshot('ETH', 3450, 0.008, 0.02, 0.0001, 500000000, 2000000, 0.0002, 25000000),
  };
}

function getFragilitySpikeScenario(): MultiMarketSnapshot {
  return {
    BTC: makeMarketSnapshot('BTC', 65000, -0.035, 0.045, 0.0008, 1500000000, 25000000, 0.0005, 10000000),
    ETH: makeMarketSnapshot('ETH', 3200, -0.042, 0.055, 0.0009, 800000000, 15000000, 0.0006, 5000000),
  };
}

function getCascadeScenario(): MultiMarketSnapshot {
  return {
    BTC: makeMarketSnapshot('BTC', 58000, -0.12, 0.09, -0.0015, 500000000, 150000000, 0.002, 2000000),
    ETH: makeMarketSnapshot('ETH', 2800, -0.15, 0.11, -0.0020, 250000000, 80000000, 0.003, 1000000),
  };
}

function getExhaustionScenario(): MultiMarketSnapshot {
  return {
    BTC: makeMarketSnapshot('BTC', 56500, -0.02, 0.04, -0.0002, 450000000, 10000000, 0.0008, 15000000),
    ETH: makeMarketSnapshot('ETH', 2750, -0.015, 0.045, -0.0003, 230000000, 5000000, 0.001, 8000000),
  };
}

function getRecoveryScenario(): MultiMarketSnapshot {
  return {
    BTC: makeMarketSnapshot('BTC', 59000, 0.03, 0.025, 0.00005, 550000000, 2000000, 0.0003, 30000000),
    ETH: makeMarketSnapshot('ETH', 2950, 0.04, 0.03, 0.00006, 300000000, 1000000, 0.0004, 15000000),
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
