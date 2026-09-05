// Data classification
export type DataSource = 'OBSERVED' | 'DERIVED' | 'ESTIMATED';

// Market data
export interface MarketDataPoint {
  value: number;
  source: DataSource;
  timestamp: number;
  age: number; // ms since fetch
}

export interface MarketSnapshot {
  symbol: string;
  price: MarketDataPoint;
  priceChange24h: MarketDataPoint;
  priceChangePercent24h: MarketDataPoint;
  volume24h: MarketDataPoint;
  high24h: MarketDataPoint;
  low24h: MarketDataPoint;
  volatility: MarketDataPoint; // DERIVED
  fundingRate: MarketDataPoint; // may be ESTIMATED
  openInterest: MarketDataPoint; // may be ESTIMATED
  liquidationActivity: MarketDataPoint; // ESTIMATED
  liquidityDepth: MarketDataPoint; // DERIVED from order book
  timestamp: number;
  isStale: boolean;
}

export interface MultiMarketSnapshot {
  snapshots: Record<string, MarketSnapshot>;
  timestamp: number;
  isStale: boolean;
}

// Atlas modes
export type AtlasMode = 'OPPORTUNITY' | 'DEFENSE' | 'HUNT' | 'RECOVERY';

// Pipeline stages
export type PipelineStage = 'OBSERVE' | 'DISCOVER' | 'COMPARE' | 'PRICE_RISK' | 'STRESS' | 'REFEREE' | 'ALLOCATE' | 'MONITOR' | 'DEFEND_HUNT' | 'RECOVER' | 'REALLOCATE';
export type PipelineStageStatus = 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'SKIPPED';

export interface PipelineState {
  stages: { stage: PipelineStage; status: PipelineStageStatus; detail?: string }[];
  currentStage: PipelineStage;
}

// Portfolio
export interface PortfolioState {
  totalCapital: number;
  availableCapital: number;
  allocatedCapital: number;
  atRiskCapital: number;
  positions: Position[];
  timestamp: number;
}

export interface Position {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  allocationUsd: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: number;
  thesisStatus: 'VALID' | 'DETERIORATING' | 'INVALIDATED';
  thesisReason: string;
  invalidationConditions: string[];
}

// Opportunity
export type OpportunityType = 'DIRECTIONAL_LONG' | 'DIRECTIONAL_SHORT' | 'CARRY' | 'BASIS' | 'HEDGE' | 'DEFENSIVE' | 'HOLD' | 'POST_DISLOCATION';

export interface Opportunity {
  id: string;
  name: string;
  type: OpportunityType;
  asset: string;
  expectedReturn: number;
  expectedRisk: number;
  executionCost: number;
  slippageCost: number;
  liquidityScore: number; // 0-1, higher is better
  fragilityPenalty: number;
  portfolioImpact: number;
  concentrationPenalty: number;
  opportunityScore: number; // final score after all penalties
  finalAdvantage: number; // vs current allocation
  confidence: number; // 0-1
  source: DataSource;
}

// Opportunity cost
export interface OpportunityCostAnalysis {
  currentExpectedValue: number;
  proposedExpectedValue: number;
  incrementalExpectedValue: number;
  executionCost: number;
  slippageCost: number;
  liquidityPenalty: number;
  portfolioRiskPenalty: number;
  fragilityPenalty: number;
  concentrationPenalty: number;
  finalAdvantage: number;
}

// Allocation Proposal
export type ProposalDirection = 'LONG' | 'SHORT' | 'HEDGE' | 'DEFENSIVE' | 'HOLD';

export interface AllocationProposal {
  id: string;
  asset: string;
  direction: ProposalDirection;
  allocationUsd: number;
  leverage: number;
  expectedReturn: number;
  expectedRisk: number;
  rationale: string;
  invalidationConditions: string[];
  confidence: number;
  opportunityCost: OpportunityCostAnalysis;
  timestamp: number;
}

// Referee
export type RefereeDecisionType = 'ALLOW' | 'RESIZE' | 'DENY';
export type RuleStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface RuleEvaluation {
  rule: string;
  ruleLabel: string;
  status: RuleStatus;
  currentValue: number;
  limit: number;
  impact: string;
}

export interface RefereeDecision {
  decision: RefereeDecisionType;
  requestedAllocation: number;
  approvedAllocation: number;
  rules: RuleEvaluation[];
  reason: string;
  timestamp: number;
}

// Risk Configuration
export interface RiskConfig {
  maxLeverage: number;
  maxAssetConcentration: number; // 0-1
  maxTotalExposure: number; // 0-1 of capital
  maxNetExposure: number; // 0-1
  maxTradeLoss: number; // USD
  dailyLossLimit: number; // USD
  minimumLiquidity: number; // 0-1
  maxSlippage: number; // 0-1
  maxFragilityScore: number; // 0-1
  minAvailableCapital: number; // 0-1 of total
  maxHuntAllocation: number; // 0-1 of total
}

// Fragility
export type FragilityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface FragilityComponent {
  name: string;
  value: number; // 0-1
  weight: number;
  weightedValue: number;
  source: DataSource;
  description: string;
}

export interface FragilityAssessment {
  score: number; // 0-1
  level: FragilityLevel;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  components: FragilityComponent[];
  previousScore: number | null;
  timestamp: number;
}

// Execution
export type ExecutionMode = 'PAPER' | 'LIVE';

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
  leverage?: number;
}

export interface ApprovedOrder extends OrderRequest {
  proposalId: string;
  refereeDecisionId: string;
  approvedAllocation: number;
}

export interface OrderPreview {
  estimatedPrice: number;
  estimatedFee: number;
  estimatedSlippage: number;
  estimatedTotal: number;
}

export interface ExecutionResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  executedPrice: number;
  executedQuantity: number;
  fee: number;
  slippage: number;
  timestamp: number;
  mode: ExecutionMode;
}

// Trading Adapter
export interface AccountState {
  totalBalance: number;
  availableBalance: number;
  unrealizedPnl: number;
  marginUsed: number;
  mode: ExecutionMode;
}

// Journal
export type JournalEventType = 'OBSERVATION' | 'FRAGILITY_CHANGE' | 'OPPORTUNITY_FOUND' | 'OPPORTUNITY_REJECTED' | 'PROPOSAL_CREATED' | 'REFEREE_DECISION' | 'EXECUTION' | 'MODE_CHANGE' | 'THESIS_UPDATE' | 'CYCLE_COMPLETE' | 'ERROR' | 'DATA_STALE';

export interface JournalEvent {
  id: string;
  type: JournalEventType;
  timestamp: number;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  mode: AtlasMode;
}

// Atlas Cycle
export interface AtlasCycleResult {
  cycleId: string;
  timestamp: number;
  mode: AtlasMode;
  previousMode: AtlasMode;
  marketSnapshot: MultiMarketSnapshot;
  portfolioState: PortfolioState;
  fragility: FragilityAssessment;
  opportunities: Opportunity[];
  selectedOpportunity: Opportunity | null;
  proposal: AllocationProposal | null;
  refereeDecision: RefereeDecision | null;
  execution: ExecutionResult | null;
  pipeline: PipelineState;
  decision: AtlasDecisionSummary;
  journalEvents: JournalEvent[];
}

export interface AtlasDecisionSummary {
  action: string;
  explanation: string;
  details: string[];
}

// Atlas State (for API/UI)
export interface AtlasState {
  mode: AtlasMode;
  executionMode: ExecutionMode;
  capital: {
    total: number;
    available: number;
    allocated: number;
    atRisk: number;
  };
  decision: AtlasDecisionSummary;
  fragility: FragilityAssessment;
  pipeline: PipelineState;
  positions: Position[];
  recentJournal: JournalEvent[];
  marketSnapshots: Record<string, MarketSnapshot>;
  lastCycleAt: number | null;
  timestamp: number;
}

// Demo
export type DemoScenario = 'NORMAL' | 'FRAGILITY_SPIKE' | 'CASCADE' | 'EXHAUSTION' | 'RECOVERY';

// Autopsy
export interface AllocationAutopsy {
  positionId: string;
  expectedReturn: number;
  realizedReturn: number;
  expectedRisk: number;
  realizedRisk: number;
  executionCost: number;
  slippage: number;
  opportunityMissed: number;
  fragilityChange: number;
  decisionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  analysis: string;
}
