import { 
  AtlasState, AtlasCycleResult, AtlasMode, DemoScenario, 
  MultiMarketSnapshot, FragilityAssessment, Opportunity, AllocationProposal, 
  RiskConfig, JournalEvent, PortfolioState, PipelineState, PipelineStage, 
  AllocationAutopsy, ExecutionMode, PendingExecution, PolicyVersion, 
  ReconciliationResult, ExecutionResult
} from '../types';
import { calculateFragility } from '../fragility/fragility-engine';
import { generateOpportunities } from '../opportunity/opportunity-engine';
import { rankOpportunities, findBestOpportunity, calculateOpportunityCost } from '../opportunity/opportunity-cost-engine';
import { evaluateProposal } from '../referee/risk-referee';
import { DEFAULT_RISK_CONFIG } from '../referee/risk-config';
import { PolicyRegistry, getPolicyRegistry } from '../referee/policy-registry';
import { SimulationAdapter } from '../execution/simulation-adapter';
import { BinanceAgentOSAdapter, getBinanceLiveAdapter } from '../execution/binance-adapter';
import { ExecutionController } from '../execution/execution-controller';
import { createPendingExecution } from '../execution/pending-execution';
import { reconcileExecution } from '../execution/reconciliation-engine';
import { PortfolioManager } from '../portfolio/portfolio-manager';
import { detectMode, detectCascade, detectLiquidationExhaustion } from './mode-detector';
import { Journal, ChainVerificationResult } from '../journal/journal';
import { getDemoMarketData } from '../demo/demo-scenarios';
import { getBinanceMarketService } from '../market/binance-market-data';
import { getAutopsyEngine } from '../autopsy/autopsy-engine';

function createProposal(
  opportunity: Opportunity, 
  analysis: any, 
  portfolio: PortfolioState, 
  riskConfig: RiskConfig
): AllocationProposal {
  let direction: 'LONG' | 'SHORT' | 'HEDGE' | 'DEFENSIVE' | 'HOLD' = 'LONG';
  if (opportunity.type === 'DIRECTIONAL_SHORT' || opportunity.type === 'HEDGE') {
    direction = 'SHORT';
  } else if (opportunity.type === 'DEFENSIVE') {
    direction = 'DEFENSIVE';
  } else if (opportunity.type === 'HOLD') {
    direction = 'HOLD';
  }

  // Sizing based on available capital and asset concentration limits
  const allocationUsd = direction === 'HOLD' 
    ? 0 
    : Math.min(portfolio.availableCapital * 0.15, portfolio.totalCapital * riskConfig.maxAssetConcentration);

  return {
    id: 'prop_' + Math.random().toString(16).substring(2, 8),
    asset: opportunity.asset,
    direction,
    allocationUsd: Math.max(0, allocationUsd),
    leverage: opportunity.type === 'CARRY' ? 2 : 1,
    expectedReturn: opportunity.expectedReturn,
    expectedRisk: opportunity.expectedRisk,
    rationale: `Capital reallocation thesis: Expected ${opportunity.expectedReturn > 0 ? '+' : ''}${(opportunity.expectedReturn * 100).toFixed(2)}% with final net advantage of ${(analysis?.finalAdvantage * 100).toFixed(2)}% vs current allocation.`,
    invalidationConditions: [
      `Fragility exceeds ${riskConfig.maxFragilityScore}`,
      'Price moves >10% adverse to thesis',
      'Liquidation pressure clusters spike'
    ],
    confidence: opportunity.confidence,
    opportunityCost: analysis,
    timestamp: Date.now()
  };
}

export class AtlasOrchestrator {
  private mode: AtlasMode = 'OPPORTUNITY';
  private simAdapter: SimulationAdapter;
  private liveAdapter: BinanceAgentOSAdapter;
  private executionController: ExecutionController;
  private portfolioManager: PortfolioManager;
  private journal: Journal;
  private policyRegistry: PolicyRegistry;
  private riskConfig: RiskConfig;
  private lastFragility: FragilityAssessment | null = null;
  private lastCycleResult: AtlasCycleResult | null = null;
  private cycleCount: number = 0;
  private demoScenario: DemoScenario = 'NORMAL';
  private dataSourceMode: 'LIVE_BINANCE' | 'DEMO_SCENARIO' = 'LIVE_BINANCE';
  private executionMode: ExecutionMode = (process.env.ATLAS_EXECUTION_MODE === 'LIVE' ? 'LIVE' : 'PAPER');
  private autopsies: AllocationAutopsy[] = [];
  private pendingExecutions: Map<string, PendingExecution> = new Map();
  private reconciliations: ReconciliationResult[] = [];
  private requireOperatorConfirmation: boolean = true;

  constructor(initialBalance: number = 100_000) {
    this.policyRegistry = getPolicyRegistry();
    this.riskConfig = this.policyRegistry.getCurrentConfig();

    this.simAdapter = new SimulationAdapter(initialBalance);
    this.liveAdapter = getBinanceLiveAdapter();
    
    // Choose active adapter based on execution mode
    const activeAdapter = this.executionMode === 'LIVE' ? this.liveAdapter : this.simAdapter;
    this.executionController = new ExecutionController(activeAdapter);
    this.portfolioManager = new PortfolioManager(activeAdapter);
    this.journal = new Journal();
  }

  setExecutionMode(mode: ExecutionMode) {
    this.executionMode = mode;
    const activeAdapter = mode === 'LIVE' ? this.liveAdapter : this.simAdapter;
    this.executionController = new ExecutionController(activeAdapter);
    this.portfolioManager = new PortfolioManager(activeAdapter);
    const policy = this.policyRegistry.getCurrentPolicy();
    this.journal.log('OBSERVATION', 'Execution Mode Switched', `Execution mode set to ${mode}`, this.mode, { mode }, {
      policyVersion: policy.version,
      policyHash: policy.hash,
    });
  }

  setRequireOperatorConfirmation(require: boolean) {
    this.requireOperatorConfirmation = require;
  }

  getRequireOperatorConfirmation(): boolean {
    return this.requireOperatorConfirmation;
  }

  setBinanceCredentials(apiKey: string, apiSecret: string, useTestnet: boolean = false) {
    this.liveAdapter.setCredentials(apiKey, apiSecret, useTestnet);
    const policy = this.policyRegistry.getCurrentPolicy();
    this.journal.log('OBSERVATION', 'Binance Credentials Updated', 'Updated API credentials for Live Binance Agent OS Adapter', this.mode, undefined, {
      policyVersion: policy.version,
      policyHash: policy.hash,
    });
  }

  /**
   * Main orchestrator decision loop:
   * Discover -> Compare -> Price Risk -> Referee -> Gate -> Allocate -> Monitor
   */
  async runCycle(customMarketData?: MultiMarketSnapshot): Promise<AtlasCycleResult> {
    this.cycleCount++;
    const cycleTimestamp = Date.now();
    const currentPolicy = this.policyRegistry.getCurrentPolicy();
    const policyContext = { policyVersion: currentPolicy.version, policyHash: currentPolicy.hash };

    // Stage 1: OBSERVE - Ingest real market data with fail-closed guarantee
    let marketData: MultiMarketSnapshot;
    if (customMarketData) {
      marketData = customMarketData;
    } else if (this.dataSourceMode === 'LIVE_BINANCE') {
      try {
        marketData = await getBinanceMarketService().fetchMultiMarketSnapshot(['BTC', 'ETH']);
      } catch (err: any) {
        // FAIL-CLOSED: Refuse to fallback silently to demo data in LIVE mode
        const failClosedReason = `Live Binance market data unavailable: ${err?.message || String(err)}. Enforcing fail-closed gate: capital allocation blocked.`;
        
        this.journal.log('FAIL_CLOSED', 'Fail-Closed Gate Activated: Telemetry Offline', failClosedReason, this.mode, {
          error: err?.message,
          dataSourceMode: this.dataSourceMode,
        }, policyContext);

        const portfolio = await this.portfolioManager.getState();
        const fallbackFragility: FragilityAssessment = this.lastFragility || {
          score: 0.5,
          level: 'MODERATE',
          trend: 'STABLE',
          components: [],
          previousScore: null,
          timestamp: cycleTimestamp,
        };

        const result: AtlasCycleResult = {
          cycleId: this.cycleCount.toString(),
          timestamp: cycleTimestamp,
          mode: this.mode,
          previousMode: this.mode,
          marketSnapshot: { snapshots: {}, timestamp: cycleTimestamp, isStale: true },
          portfolioState: portfolio,
          fragility: fallbackFragility,
          opportunities: [],
          selectedOpportunity: null,
          proposal: null,
          refereeDecision: null,
          execution: null,
          pendingExecution: null,
          policyVersion: currentPolicy,
          failClosed: true,
          failClosedReason,
          pipeline: {
            stages: [
              { stage: 'OBSERVE', status: 'COMPLETE', detail: 'Live Binance REST failed (FAIL-CLOSED)' },
              { stage: 'DISCOVER', status: 'SKIPPED', detail: 'Telemetry offline' },
              { stage: 'COMPARE', status: 'SKIPPED', detail: 'No fresh candidates' },
              { stage: 'PRICE_RISK', status: 'SKIPPED', detail: 'Risk calculation halted' },
              { stage: 'STRESS', status: 'SKIPPED', detail: 'Skipped' },
              { stage: 'REFEREE', status: 'SKIPPED', detail: 'Fail-closed active' },
              { stage: 'ALLOCATE', status: 'SKIPPED', detail: 'Capital safely held' },
              { stage: 'MONITOR', status: 'ACTIVE', detail: 'Holding capital in safety' },
            ],
            currentStage: 'MONITOR',
          },
          decision: {
            action: 'HOLD (FAIL-CLOSED: TELEMETRY OFFLINE)',
            explanation: failClosedReason,
            details: [
              'Fail-closed enforcement active',
              'No new risk authorized without verified fresh market telemetry',
              `Policy Version: ${currentPolicy.version} (${currentPolicy.hash.substring(0, 10)}...)`
            ],
          },
          journalEvents: this.journal.getRecent(30),
        };

        this.lastCycleResult = result;
        return result;
      }
    } else {
      marketData = getDemoMarketData(this.demoScenario);
    }

    // Fail-closed freshness validation: check if snapshots are stale
    const isTelemetryStale = marketData.isStale || Object.values(marketData.snapshots).some(
      s => s.isStale || s.price.freshness === 'STALE'
    );

    if (isTelemetryStale) {
      const failClosedReason = 'Market telemetry is marked STALE or exceeded freshness threshold. Enforcing fail-closed gate: capital allocation blocked.';
      this.journal.log('FAIL_CLOSED', 'Fail-Closed Gate Activated: Stale Telemetry', failClosedReason, this.mode, {
        staleSymbols: Object.keys(marketData.snapshots).filter(k => marketData.snapshots[k].isStale || marketData.snapshots[k].price.freshness === 'STALE'),
      }, policyContext);

      const portfolio = await this.portfolioManager.getState();
      const fallbackFragility: FragilityAssessment = this.lastFragility || {
        score: 0.5,
        level: 'MODERATE',
        trend: 'STABLE',
        components: [],
        previousScore: null,
        timestamp: cycleTimestamp,
      };

      const result: AtlasCycleResult = {
        cycleId: this.cycleCount.toString(),
        timestamp: cycleTimestamp,
        mode: this.mode,
        previousMode: this.mode,
        marketSnapshot: marketData,
        portfolioState: portfolio,
        fragility: fallbackFragility,
        opportunities: [],
        selectedOpportunity: null,
        proposal: null,
        refereeDecision: null,
        execution: null,
        pendingExecution: null,
        policyVersion: currentPolicy,
        failClosed: true,
        failClosedReason,
        pipeline: {
          stages: [
            { stage: 'OBSERVE', status: 'COMPLETE', detail: 'Telemetry received but STALE' },
            { stage: 'DISCOVER', status: 'SKIPPED', detail: 'Stale data' },
            { stage: 'COMPARE', status: 'SKIPPED', detail: 'No fresh candidates' },
            { stage: 'PRICE_RISK', status: 'SKIPPED', detail: 'Risk calculation halted' },
            { stage: 'STRESS', status: 'SKIPPED', detail: 'Skipped' },
            { stage: 'REFEREE', status: 'SKIPPED', detail: 'Fail-closed active' },
            { stage: 'ALLOCATE', status: 'SKIPPED', detail: 'Capital safely held' },
            { stage: 'MONITOR', status: 'ACTIVE', detail: 'Holding capital in safety' },
          ],
          currentStage: 'MONITOR',
        },
        decision: {
          action: 'HOLD (FAIL-CLOSED: STALE DATA)',
          explanation: failClosedReason,
          details: [
            'Fail-closed enforcement active: stale market data',
            'Zero new capital risk permitted until data freshness restores',
            `Policy: ${currentPolicy.version}`
          ],
        },
        journalEvents: this.journal.getRecent(30),
      };

      this.lastCycleResult = result;
      return result;
    }

    this.journal.log('OBSERVATION', 'Market State Observed', `Tracked: ${Object.keys(marketData.snapshots).join(', ')} | Mode: ${this.dataSourceMode}`, this.mode, {
      snapshots: Object.keys(marketData.snapshots).map(s => ({
        symbol: s,
        price: marketData.snapshots[s].price.value,
        freshness: marketData.snapshots[s].price.freshness,
        status: marketData.snapshots[s].price.status,
        change24h: marketData.snapshots[s].priceChangePercent24h.value
      }))
    }, policyContext);

    // Stage 2: Collect portfolio state & update active position theses
    const portfolio = await this.portfolioManager.getState();
    const updatedPositions = await this.portfolioManager.updatePositionTheses(marketData, this.lastFragility || { score: 0.1, level: 'LOW', trend: 'STABLE', components: [], previousScore: null, timestamp: cycleTimestamp });

    // Stage 3: DISCOVER - Calculate Market Fragility
    const fragility = calculateFragility(marketData.snapshots, this.lastFragility?.score || null);
    this.lastFragility = fragility;

    const cascadeDetected = detectCascade(marketData, fragility);
    const liquidationExhaustion = detectLiquidationExhaustion(marketData, fragility);

    const { mode, reason: modeReason } = detectMode({
      fragility,
      portfolio,
      market: marketData,
      previousMode: this.mode,
      cascadeDetected,
      liquidationExhaustion
    });

    const previousMode = this.mode;
    this.mode = mode;

    if (this.mode !== previousMode) {
      this.journal.log('MODE_CHANGE', `Operating Mode Transition: ${previousMode} -> ${this.mode}`, modeReason, this.mode, { previousMode, mode: this.mode }, policyContext);
    }

    // Stage 4: COMPARE - Generate competing capital allocations
    let opportunities = generateOpportunities(marketData, portfolio, fragility);
    opportunities = rankOpportunities(opportunities, portfolio, fragility);

    // Stage 5: PRICE RISK - Rank against HOLD via Opportunity-Cost Engine
    const bestResult = findBestOpportunity(opportunities, portfolio, fragility);

    let actionTaken = 'HOLD CURRENT ALLOCATION';
    let explanation = 'No alternative currently provides sufficient incremental risk-adjusted value after execution cost and fragility penalties.';
    let proposal: AllocationProposal | null = null;
    let refereeResult = null;
    let execution: ExecutionResult | null = null;
    let pendingExecution: PendingExecution | null = null;

    // Stage 6: STRESS & Stage 7: DETERMINISTIC REFEREE
    if (bestResult && bestResult.best && bestResult.best.type !== 'HOLD' && bestResult.analysis.finalAdvantage > 0) {
      proposal = createProposal(bestResult.best, bestResult.analysis, portfolio, this.riskConfig);
      
      this.journal.log('PROPOSAL_CREATED', `Proposal: ${proposal.direction} ${proposal.asset}`, proposal.rationale, this.mode, { proposal }, policyContext);

      // Deterministic risk evaluation with policy hash traceability
      const dailyLossToday = await this.portfolioManager.calculateDailyLoss();
      const currentPrice = marketData.snapshots[proposal.asset]?.price?.value || 100;

      refereeResult = evaluateProposal(
        proposal, 
        portfolio, 
        fragility, 
        this.riskConfig, 
        dailyLossToday,
        { currentPrice, policyHash: currentPolicy.hash }
      );

      this.journal.log('REFEREE_DECISION', `Referee Decision: ${refereeResult.decision}`, refereeResult.reason, this.mode, { refereeResult }, policyContext);

      // Stage 8: ALLOCATE (if allowed or resized)
      if (refereeResult.decision === 'ALLOW' || refereeResult.decision === 'RESIZE') {
        if (this.requireOperatorConfirmation) {
          // Execution Gate: Create pending execution awaiting operator confirmation
          pendingExecution = createPendingExecution(proposal, refereeResult, portfolio, currentPrice, currentPolicy);
          this.pendingExecutions.set(pendingExecution.id, pendingExecution);

          actionTaken = `AWAITING OPERATOR CONFIRMATION (${refereeResult.decision === 'RESIZE' ? 'RESIZED' : 'APPROVED'})`;
          explanation = `Proposal for ${proposal.direction} ${proposal.asset} ($${refereeResult.approvedAllocation.toLocaleString()}) approved under Policy ${currentPolicy.version}. Staged in Execution Gate pending explicit operator confirmation.`;

          this.journal.log('PROPOSAL_CREATED', 'Execution Gate: Operator Confirmation Required', explanation, this.mode, {
            pendingExecutionId: pendingExecution.id,
            approvedAllocation: refereeResult.approvedAllocation,
            estimatedFee: pendingExecution.orderPreview.estimatedFee,
            postTradeExposure: pendingExecution.postTradeProjection.projectedNetExposure,
          }, policyContext);
        } else {
          // Auto-execute (when operator gate is explicitly disabled)
          try {
            execution = await this.executionController.execute(proposal, refereeResult, currentPrice);
            actionTaken = `${refereeResult.decision === 'RESIZE' ? 'RESIZED & EXECUTED' : 'EXECUTED'} ${proposal.direction} on ${proposal.asset} (${this.executionMode})`;
            explanation = `Deployed $${refereeResult.approvedAllocation.toLocaleString()} with +${(bestResult.analysis.finalAdvantage * 100).toFixed(2)}% net advantage over current allocation. ${refereeResult.reason}`;
            
            // Post-Trade Reconciliation
            const preview = createPendingExecution(proposal, refereeResult, portfolio, currentPrice, currentPolicy).orderPreview;
            const expectedQty = refereeResult.approvedAllocation / currentPrice;
            const reconciliation = reconcileExecution(preview, expectedQty, execution);
            this.reconciliations.unshift(reconciliation);

            this.journal.log('EXECUTION', actionTaken, explanation, this.mode, { execution, refereeResult }, policyContext);
            this.journal.log('RECONCILIATION', `Post-Trade Reconciliation: ${reconciliation.status}`, reconciliation.details, this.mode, { reconciliation }, policyContext);
          } catch (execErr: any) {
            actionTaken = 'EXECUTION BLOCKED';
            explanation = `Execution invariant failed: ${execErr.message}`;
            this.journal.log('ERROR', 'Execution Failed', explanation, this.mode, undefined, policyContext);
          }
        }
      } else {
        actionTaken = 'HOLD (PROPOSAL DENIED)';
        explanation = `Top candidate ${proposal.asset} denied by Risk Referee: ${refereeResult.reason}. Maintaining capital safety.`;
      }
    } else {
      // Conscious DO NOTHING decision
      actionTaken = 'HOLD CURRENT ALLOCATION';
      explanation = bestResult?.analysis 
        ? `Top alternative ${bestResult.best.name} (+${(bestResult.best.expectedReturn * 100).toFixed(2)}% gross) yields only ${(bestResult.analysis.finalAdvantage * 100).toFixed(2)}% net advantage after costs ($${bestResult.best.executionCost.toFixed(3)}) & fragility penalty ($${bestResult.best.fragilityPenalty.toFixed(3)}). Capital remains in place.`
        : 'Current market state does not present opportunities with positive risk-adjusted expected value.';
      
      this.journal.log('OBSERVATION', 'Decision: Hold Current Allocation', explanation, this.mode, undefined, policyContext);
    }

    // Stage 9: MONITOR & Allocation Autopsies
    const autopsyEngine = getAutopsyEngine();
    for (const pos of updatedPositions) {
      const snap = marketData.snapshots[pos.symbol] || marketData.snapshots['BTC'];
      if (snap) {
        const autopsy = autopsyEngine.evaluatePosition({
          position: pos,
          currentMarket: snap,
          initialFragilityScore: 0.25,
          currentFragility: fragility,
          alternativeOpportunities: opportunities
        });
        this.autopsies = [autopsy, ...this.autopsies.filter(a => a.positionId !== pos.id)].slice(0, 20);
      }
    }

    // Pipeline status tracking
    const pipeline: PipelineState = {
      stages: [
        { stage: 'OBSERVE', status: 'COMPLETE', detail: `${Object.keys(marketData.snapshots).length} symbols ingested (${this.dataSourceMode})` },
        { stage: 'DISCOVER', status: 'COMPLETE', detail: `Mode: ${this.mode} (Fragility: ${(fragility.score * 100).toFixed(1)}%)` },
        { stage: 'COMPARE', status: 'COMPLETE', detail: `${opportunities.length} candidates evaluated` },
        { stage: 'PRICE_RISK', status: 'COMPLETE', detail: `Opportunity cost priced` },
        { stage: 'STRESS', status: 'COMPLETE', detail: 'Tail risk & drawdown modeled' },
        { stage: 'REFEREE', status: refereeResult ? (refereeResult.decision === 'DENY' ? 'SKIPPED' : 'COMPLETE') : 'COMPLETE', detail: refereeResult?.decision || 'No trade needed' },
        { stage: 'ALLOCATE', status: (execution || pendingExecution) ? 'COMPLETE' : 'SKIPPED', detail: actionTaken },
        { stage: 'MONITOR', status: 'ACTIVE', detail: `${updatedPositions.length} positions tracked` },
      ],
      currentStage: 'MONITOR'
    };

    const result: AtlasCycleResult = {
      cycleId: this.cycleCount.toString(),
      timestamp: cycleTimestamp,
      mode: this.mode,
      previousMode,
      marketSnapshot: marketData,
      portfolioState: { ...portfolio, positions: updatedPositions },
      fragility,
      opportunities,
      selectedOpportunity: bestResult?.best || null,
      proposal,
      refereeDecision: refereeResult,
      execution,
      pendingExecution,
      policyVersion: currentPolicy,
      failClosed: false,
      pipeline,
      decision: {
        action: actionTaken,
        explanation,
        details: [
          `Mode: ${this.mode}`,
          `Fragility: ${(fragility.score * 100).toFixed(1)}% (${fragility.level})`,
          `Execution Engine: ${this.executionMode}`,
          `Active Positions: ${updatedPositions.length}`,
          `Policy: ${currentPolicy.version} (${currentPolicy.hash.substring(0, 8)}...)`,
          pendingExecution ? `Pending Execution: ${pendingExecution.id}` : 'No executions staged',
        ]
      },
      journalEvents: this.journal.getRecent(30)
    };

    this.lastCycleResult = result;
    return result;
  }

  /**
   * Confirms and executes a pending execution from the operator gate.
   */
  async confirmExecution(pendingExecutionId: string): Promise<{ execution: ExecutionResult; reconciliation: ReconciliationResult }> {
    const pending = this.pendingExecutions.get(pendingExecutionId);
    if (!pending) {
      throw new Error(`Pending execution ${pendingExecutionId} not found`);
    }

    if (pending.status !== 'PENDING') {
      throw new Error(`Pending execution ${pendingExecutionId} is already ${pending.status}`);
    }

    if (Date.now() > pending.expiresAt) {
      pending.status = 'EXPIRED';
      throw new Error(`Pending execution ${pendingExecutionId} has expired`);
    }

    const currentPolicy = this.policyRegistry.getCurrentPolicy();
    const policyContext = { policyVersion: currentPolicy.version, policyHash: currentPolicy.hash };

    // Record operator confirmation
    pending.status = 'CONFIRMED';
    this.journal.log('OPERATOR_CONFIRMED', 'Operator Confirmed Execution', `Operator explicitly authorized execution of ${pending.proposal.direction} on ${pending.proposal.asset} ($${pending.refereeDecision.approvedAllocation.toLocaleString()})`, this.mode, {
      pendingExecutionId,
      policyHash: pending.policyVersion.hash,
    }, policyContext);

    // Submit order via active execution adapter
    const execution = await this.executionController.execute(
      pending.proposal, 
      pending.refereeDecision, 
      pending.orderPreview.estimatedPrice
    );

    // Reconcile fills vs preview
    const expectedQty = pending.refereeDecision.approvedAllocation / pending.orderPreview.estimatedPrice;
    const reconciliation = reconcileExecution(pending.orderPreview, expectedQty, execution);
    this.reconciliations.unshift(reconciliation);

    this.journal.log('EXECUTION', `Executed ${pending.proposal.direction} ${pending.proposal.asset}`, `Executed fill on ${pending.proposal.asset}: ${execution.executedQuantity.toFixed(4)} units @ $${execution.executedPrice.toFixed(2)}`, this.mode, {
      execution,
      reconciliation,
    }, policyContext);

    this.journal.log('RECONCILIATION', `Post-Trade Reconciliation: ${reconciliation.status}`, reconciliation.details, this.mode, {
      reconciliation,
    }, policyContext);

    return { execution, reconciliation };
  }

  /**
   * Rejects/cancels a pending execution.
   */
  cancelPendingExecution(pendingExecutionId: string, reason: string = 'Cancelled by operator'): void {
    const pending = this.pendingExecutions.get(pendingExecutionId);
    if (!pending) {
      throw new Error(`Pending execution ${pendingExecutionId} not found`);
    }

    pending.status = 'CANCELLED';
    const currentPolicy = this.policyRegistry.getCurrentPolicy();
    this.journal.log('OBSERVATION', 'Pending Execution Cancelled', `Pending execution ${pendingExecutionId} cancelled: ${reason}`, this.mode, {
      pendingExecutionId,
      reason,
    }, { policyVersion: currentPolicy.version, policyHash: currentPolicy.hash });
  }

  getPendingExecutions(): PendingExecution[] {
    return Array.from(this.pendingExecutions.values());
  }

  getActivePendingExecutions(): PendingExecution[] {
    const now = Date.now();
    return Array.from(this.pendingExecutions.values()).filter(p => p.status === 'PENDING' && p.expiresAt > now);
  }

  getReconciliations(): ReconciliationResult[] {
    return [...this.reconciliations];
  }

  getState(): AtlasState {
    const lastCycle = this.lastCycleResult;
    const currentPolicy = this.policyRegistry.getCurrentPolicy();
    const chainVerification = this.journal.verify();

    return {
      mode: this.mode,
      executionMode: this.executionMode,
      dataSourceMode: this.dataSourceMode,
      capital: lastCycle ? {
        total: lastCycle.portfolioState.totalCapital,
        available: lastCycle.portfolioState.availableCapital,
        allocated: lastCycle.portfolioState.allocatedCapital,
        atRisk: lastCycle.portfolioState.atRiskCapital,
      } : {
        total: 100000,
        available: 100000,
        allocated: 0,
        atRisk: 0,
      },
      decision: lastCycle?.decision || {
        action: 'AWAITING FIRST CYCLE',
        explanation: 'System ready to stream live market feeds and allocate capital.',
        details: [],
      },
      fragility: this.lastFragility || { score: 0, level: 'LOW' as const, trend: 'STABLE' as const, components: [], previousScore: null, timestamp: Date.now() },
      pipeline: lastCycle?.pipeline || { stages: [], currentStage: 'OBSERVE' as const },
      positions: lastCycle?.portfolioState.positions || [],
      recentJournal: this.journal.getRecent(50),
      marketSnapshots: lastCycle?.marketSnapshot.snapshots || {},
      opportunities: lastCycle?.opportunities || [],
      lastCycleResult: lastCycle || null,
      lastCycleAt: lastCycle?.timestamp || null,
      autopsies: this.autopsies,
      policyVersion: currentPolicy,
      pendingExecutions: this.getActivePendingExecutions(),
      reconciliations: this.reconciliations.slice(0, 20),
      chainVerification,
      timestamp: Date.now(),
    };
  }

  setDemoScenario(scenario: DemoScenario): void {
    this.demoScenario = scenario;
    this.dataSourceMode = 'DEMO_SCENARIO';
    const policy = this.policyRegistry.getCurrentPolicy();
    this.journal.log('OBSERVATION', 'Scenario Active', `Switched to ${scenario}`, this.mode, { scenario }, {
      policyVersion: policy.version,
      policyHash: policy.hash,
    });
  }

  setDataSourceMode(mode: 'LIVE_BINANCE' | 'DEMO_SCENARIO'): void {
    this.dataSourceMode = mode;
    const policy = this.policyRegistry.getCurrentPolicy();
    this.journal.log('OBSERVATION', 'Data Feed Configured', `Data source set to ${mode}`, this.mode, { mode }, {
      policyVersion: policy.version,
      policyHash: policy.hash,
    });
  }

  getRiskConfig(): RiskConfig { 
    return this.policyRegistry.getCurrentConfig(); 
  }

  setRiskConfig(config: RiskConfig): PolicyVersion {
    const updatedPolicy = this.policyRegistry.updateConfig(config);
    this.riskConfig = this.policyRegistry.getCurrentConfig();
    this.journal.log(
      'OBSERVATION', 
      'Risk Policy Updated', 
      `Policy updated to ${updatedPolicy.version} (Hash: ${updatedPolicy.hash.substring(0, 10)}...) by human operator`, 
      this.mode, 
      { config, version: updatedPolicy.version, hash: updatedPolicy.hash },
      { policyVersion: updatedPolicy.version, policyHash: updatedPolicy.hash }
    );
    return updatedPolicy;
  }

  getPolicyRegistry(): PolicyRegistry {
    return this.policyRegistry;
  }

  getCurrentPolicy(): PolicyVersion {
    return this.policyRegistry.getCurrentPolicy();
  }

  getJournal(): JournalEvent[] { return this.journal.getRecent(); }

  getJournalChain(): JournalEvent[] { return this.journal.getChain(); }

  verifyJournalChain(): ChainVerificationResult { return this.journal.verify(); }

  exportJournalChain(): string { return this.journal.exportChain(); }

  getAutopsies(): AllocationAutopsy[] { return this.autopsies; }

  reset(balance: number = 100_000): void {
    this.cycleCount = 0;
    this.simAdapter = new SimulationAdapter(balance);
    const activeAdapter = this.executionMode === 'LIVE' ? this.liveAdapter : this.simAdapter;
    this.executionController = new ExecutionController(activeAdapter);
    this.portfolioManager = new PortfolioManager(activeAdapter);
    this.journal.clear();
    this.mode = 'OPPORTUNITY';
    this.lastFragility = null;
    this.lastCycleResult = null;
    this.autopsies = [];
    this.pendingExecutions.clear();
    this.reconciliations = [];
  }
}

let instance: AtlasOrchestrator | null = null;
export function getOrchestrator(): AtlasOrchestrator {
  if (!instance) instance = new AtlasOrchestrator();
  return instance;
}
