import { DemoScenario } from '../types';
import { getDemoMarketData } from './demo-scenarios';

export class DemoController {
  private currentScenario: DemoScenario = 'NORMAL';
  
  setScenario(scenario: DemoScenario): void {
    this.currentScenario = scenario;
  }
  
  getCurrentScenario(): DemoScenario {
    return this.currentScenario;
  }
  
  getMarketData() {
    return getDemoMarketData(this.currentScenario);
  }
  
  getScenarioDescription(scenario: DemoScenario): { title: string; description: string; expectedMode: string; expectedOutcome: string } {
    switch (scenario) {
      case 'NORMAL':
        return {
          title: 'Normal',
          description: 'Stable market, good opportunities exist. Low volatility, normal funding.',
          expectedMode: 'OPPORTUNITY',
          expectedOutcome: 'Several candidates scored, best one gets ALLOW'
        };
      case 'FRAGILITY_SPIKE':
        return {
          title: 'Fragility Spike',
          description: 'Rising stress. High volatility, elevated funding, OI surging, liquidations increasing.',
          expectedMode: 'DEFENSE',
          expectedOutcome: 'Most proposals DENIED or RESIZED due to fragility'
        };
      case 'CASCADE':
        return {
          title: 'Cascade',
          description: 'Market crash with forced deleveraging. Extreme volatility, massive liquidations, negative funding.',
          expectedMode: 'HUNT (waiting)',
          expectedOutcome: 'Referee DENIES everything, ATLAS says WAIT'
        };
      case 'EXHAUSTION':
        return {
          title: 'Exhaustion',
          description: 'Liquidation pressure declining. Volatility decreasing, market stabilizing.',
          expectedMode: 'HUNT (ready)',
          expectedOutcome: 'Small allocation ALLOWED with strict limits'
        };
      case 'RECOVERY':
        return {
          title: 'Recovery',
          description: 'Market stabilizing and recovering. Volatility normalizing, funding normalizing.',
          expectedMode: 'RECOVERY',
          expectedOutcome: 'Take profit / hold / reallocate decisions'
        };
      default:
        return {
          title: 'Unknown',
          description: 'Unknown scenario.',
          expectedMode: 'UNKNOWN',
          expectedOutcome: 'UNKNOWN'
        };
    }
  }
  
  getAllScenarios(): DemoScenario[] {
    return ['NORMAL', 'FRAGILITY_SPIKE', 'CASCADE', 'EXHAUSTION', 'RECOVERY'];
  }
}
