import { 
  AtlasState, AtlasCycleResult, AtlasMode, DemoScenario, 
  MultiMarketSnapshot, FragilityAssessment, Opportunity, AllocationProposal, RiskConfig, JournalEvent
} from '../types';
import { calculateFragility } from '../fragility';
import { generateOpportunities } from '../opportunity/opportunity-engine';
import { rankOpportunities, findBestOpportunity, calculateOpportunityCost } from '../opportunity/opportunity-cost-engine';
import { evaluateProposal } from '../referee';
import { DEFAULT_RISK_CONFIG } from '../referee/risk-config';
import { SimulationAdapter } from '../execution/simulation-adapter';
import { ExecutionController } from '../execution/execution-controller';
import { PortfolioManager } from '../portfolio/portfolio-manager';
import { detectMode, detectCascade, detectLiquidationExhaustion } from './mode-detector';
import { Journal } from '../journal/journal';

function createProposal(opportunity: Opportunity, portfolio: any, riskConfig: RiskConfig): AllocationProposal {
  return {
    id: 'prop_' + Math.random().toString(16).substring(2, 8),
    symbol: opportunity.symbol,
    strategy: opportunity.strategy,
    action: opportunity.action,
    amount: portfolio.totalValue * 0.05,
    entryPrice: opportunity.targetPrice,
    stopLoss: opportunity.targetPrice * 0.95,
    takeProfit: opportunity.targetPrice * 1.10,
    leverage: 1,
    reasoning: opportunity.thesis
  };
}

function generateDemoMarketData(scenario: DemoScenario): MultiMarketSnapshot {
  return {
    timestamp: Date.now(),
    snapshots: [
      {
        symbol: 'BTC/USDT',
        price: scenario === 'CASCADE' ? 45000 : 60000,
        priceChange24h: scenario === 'CASCADE' ? -10 : 2,
        volume24h: 1000000000,
        high24h: 62000,
        low24h: scenario === 'CASCADE' ? 44000 : 59000
      }
    ]
  };
}

export class AtlasOrchestrator {
  private mode: AtlasMode = 'OPPORTUNITY';
  private adapter: SimulationAdapter;
  private executionController: ExecutionController;
  private portfolioManager: PortfolioManager;
  private journal: Journal;
  private riskConfig: RiskConfig = { ...DEFAULT_RISK_CONFIG };
  private lastFragility: FragilityAssessment | null = null;
  private lastCycleResult: AtlasCycleResult | null = null;
  private cycleCount: number = 0;
  private demoScenario: DemoScenario = 'NORMAL';
  
  constructor(initialBalance: number = 100_000) {
    this.adapter = new SimulationAdapter(initialBalance);
    this.executionController = new ExecutionController(this.adapter);
    this.portfolioManager = new PortfolioManager(this.adapter);
    this.journal = new Journal();
  }
  
  async runCycle(marketData?: MultiMarketSnapshot): Promise<AtlasCycleResult> {
    this.cycleCount++;
    const data = marketData || generateDemoMarketData(this.demoScenario);
    
    // 1. OBSERVE & 2. Collect portfolio state
    const portfolio = await this.portfolioManager.getPortfolioState();
    
    // 3. DISCOVER - calculate fragility, detect mode
    const fragility = calculateFragility(data);
    this.lastFragility = fragility;
    
    const cascadeDetected = detectCascade(data, fragility);
    const liquidationExhaustion = detectLiquidationExhaustion(data, fragility);
    
    const { mode, reason } = detectMode({
      fragility,
      portfolio,
      market: data,
      previousMode: this.mode,
      cascadeDetected,
      liquidationExhaustion
    });
    
    const previousMode = this.mode;
    this.mode = mode;
    
    if (this.mode !== previousMode) {
      this.journal.log('MODE_CHANGE', `Mode shifted to ${this.mode}`, reason, this.mode, { previousMode, mode });
    }
    
    // 4. COMPARE - generate opportunities, rank them
    let opportunities = generateOpportunities(data, fragility, this.mode);
    
    // 5. PRICE RISK - calculate opportunity cost
    opportunities = opportunities.map(opp => ({
      ...opp,
      costMetrics: calculateOpportunityCost(opp, portfolio)
    }));
    
    const ranked = rankOpportunities(opportunities);
    const best = findBestOpportunity(ranked);
    
    let actionTaken = 'NONE';
    let reasoning = 'No valid opportunities found for current mode.';
    
    // 6. STRESS & 7. REFEREE & 8. ALLOCATE
    if (best) {
      const proposal = createProposal(best, portfolio, this.riskConfig);
      
      const refereeResult = evaluateProposal(proposal, portfolio, fragility, this.riskConfig);
      
      if (refereeResult.approved) {
        await this.executionController.execute(proposal);
        actionTaken = `EXECUTED ${proposal.action} on ${proposal.symbol}`;
        reasoning = `Referee approved best opportunity. Cost vs Alternatives justified.`;
        this.journal.log('EXECUTION', 'Executed Trade', actionTaken, this.mode, { proposal });
      } else {
        actionTaken = 'REJECTED';
        reasoning = `Referee rejected proposal: ${refereeResult.reasons.join(', ')}`;
        this.journal.log('REFEREE_REJECTION', 'Proposal Rejected', reasoning, this.mode, { proposal, reasons: refereeResult.reasons });
      }
    }
    
    // 9. MONITOR & 10. Journal everything
    const result: AtlasCycleResult = {
      cycleId: this.cycleCount,
      timestamp: Date.now(),
      mode: this.mode,
      fragility,
      portfolio,
      opportunitiesFound: opportunities.length,
      decision: {
        action: actionTaken,
        reasoning,
        versusAlternatives: best ? 'Selected highest conviction thesis' : 'N/A',
        costConsiderations: best ? 'Risk-adjusted return exceeds hurdle rate' : 'N/A',
        invalidation: best ? 'Stop loss breached or fragility spikes' : 'N/A'
      }
    };
    
    this.lastCycleResult = result;
    this.journal.log('CYCLE_COMPLETE', `Cycle ${this.cycleCount} Complete`, actionTaken, this.mode, result as any);
    
    return result;
  }
  
  getState(): AtlasState { 
    return {
      mode: this.mode,
      fragility: this.lastFragility,
      portfolio: (this.portfolioManager as any).getPortfolioStateSync ? (this.portfolioManager as any).getPortfolioStateSync() : null,
      lastCycleResult: this.lastCycleResult,
      cycleCount: this.cycleCount,
      demoScenario: this.demoScenario
    } as AtlasState;
  }
  
  setDemoScenario(scenario: DemoScenario): void { 
    this.demoScenario = scenario; 
    this.journal.log('SYSTEM', 'Demo Scenario Changed', `Changed to ${scenario}`, this.mode, { scenario });
  }
  
  getRiskConfig(): RiskConfig { return { ...this.riskConfig }; }
  
  setRiskConfig(config: RiskConfig): void { 
    this.riskConfig = { ...config }; 
    this.journal.log('SYSTEM', 'Risk Config Updated', 'Referee parameters updated', this.mode, { config });
  }
  
  getJournal(): JournalEvent[] { return this.journal.getRecent(); }
  
  reset(balance?: number): void { 
    this.cycleCount = 0;
    this.adapter = new SimulationAdapter(balance || 100_000);
    this.executionController = new ExecutionController(this.adapter);
    this.portfolioManager = new PortfolioManager(this.adapter);
    this.journal.clear();
    this.mode = 'OPPORTUNITY';
    this.lastFragility = null;
    this.lastCycleResult = null;
  }
}

// Singleton for the app
let instance: AtlasOrchestrator | null = null;
export function getOrchestrator(): AtlasOrchestrator {
  if (!instance) instance = new AtlasOrchestrator();
  return instance;
}
