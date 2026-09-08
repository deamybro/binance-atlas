import { AtlasMode, FragilityAssessment, PortfolioState, MultiMarketSnapshot } from '../types';

export interface ModeContext {
  fragility: FragilityAssessment;
  portfolio: PortfolioState;
  market: MultiMarketSnapshot;
  previousMode: AtlasMode;
  cascadeDetected: boolean;
  liquidationExhaustion: boolean;
}

export function detectMode(context: ModeContext): { mode: AtlasMode; reason: string } {
  const { fragility, portfolio, previousMode, cascadeDetected, liquidationExhaustion } = context;

  // 1. If cascadeDetected and !liquidationExhaustion -> HUNT (waiting phase)
  if (cascadeDetected && !liquidationExhaustion) {
    return { mode: 'HUNT', reason: 'Cascade detected but liquidation exhaustion not reached. Waiting phase.' };
  }
  
  // 2. If cascadeDetected and liquidationExhaustion -> HUNT (ready to act)
  if (cascadeDetected && liquidationExhaustion) {
    return { mode: 'HUNT', reason: 'Cascade detected and liquidation exhaustion reached. Ready to act.' };
  }

  // 3. If previousMode === 'HUNT' and fragility improving -> RECOVERY
  if (previousMode === 'HUNT' && fragility.level !== 'EXTREME' && fragility.level !== 'HIGH') {
    return { mode: 'RECOVERY', reason: 'Previous mode was HUNT and fragility is improving.' };
  }

  // 4. If fragility.level === 'EXTREME' -> DEFENSE (unless cascade)
  if (fragility.level === 'EXTREME') {
    return { mode: 'DEFENSE', reason: 'Extreme fragility level detected.' };
  }

  // 5. If fragility.level === 'HIGH' and portfolio has positions -> DEFENSE
  if (fragility.level === 'HIGH' && portfolio.positions.length > 0) {
    return { mode: 'DEFENSE', reason: 'High fragility and portfolio has active positions.' };
  }

  // 6. Otherwise -> OPPORTUNITY
  return { mode: 'OPPORTUNITY', reason: 'Normal market conditions.' };
}

export function detectCascade(market: MultiMarketSnapshot, fragility: FragilityAssessment): boolean {
  // Large price drop (>5% in snapshot) + extreme fragility + high liquidation
  const largePriceDrop = Object.values(market.snapshots).some(s => s.priceChangePercent24h?.value < -5);
  const extremeFragility = fragility.level === 'EXTREME';
  const highLiquidation = fragility.components.some(c => c.name.includes('Liquidation') && c.value > 0.8);
  
  return largePriceDrop && extremeFragility && highLiquidation;
}

export function detectLiquidationExhaustion(market: MultiMarketSnapshot, fragility: FragilityAssessment): boolean {
  // Liquidation activity decreasing + OI stabilizing + volatility normalizing
  const decreasingLiquidation = fragility.components.some(c => c.name.includes('Liquidation') && c.value < 0.3);
  return decreasingLiquidation && fragility.level !== 'EXTREME';
}
