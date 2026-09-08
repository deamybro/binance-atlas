// Data classification
export type DataSource = 'OBSERVED' | 'DERIVED' | 'ESTIMATED';
export type DataFreshness = 'FRESH' | 'AGING' | 'STALE';
export type DataStatus = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
export type LiquidationClassification = 'BINANCE_REPORTED' | 'ATLAS_ESTIMATE' | 'UNAVAILABLE';

// Market data
export interface MarketDataPoint {
  value: number;
  source: DataSource;
  timestamp: number;
  age: number; // ms since fetch
  freshness: DataFreshness;
  status: DataStatus;
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
  policyHash: string;
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

export type JournalEventType = 
  | 'OBSERVATION' 
  | 'FRAGILITY_CHANGE' 
  | 'OPPORTUNITY_FOUND' 
  | 'OPPORTUNITY_REJECTED' 
  | 'PROPOSAL_CREATED' 
  | 'REFEREE_DECISION' 
  | 'EXECUTION' 
  | 'MODE_CHANGE' 
  | 'THESIS_UPDATE' 
  | 'CYCLE_COMPLETE' 
  | 'ERROR' 
  | 'DATA_STALE'
  | 'FAIL_CLOSED'
  | 'OPERATOR_CONFIRMED'
  | 'RECONCILIATION';

export interface JournalEvent {
  id: string;
  type: JournalEventType;
  timestamp: number;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  mode: AtlasMode;
  hash: string;
  previousHash: string;
  policyVersion?: string;
  policyHash?: string;
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
  pendingExecution?: PendingExecution | null;
  policyVersion?: PolicyVersion;
  failClosed?: boolean;
  failClosedReason?: string;
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
  opportunities: Opportunity[];
  lastCycleResult: AtlasCycleResult | null;
  lastCycleAt: number | null;
  dataSourceMode?: 'LIVE_BINANCE' | 'DEMO_SCENARIO';
  autopsies?: AllocationAutopsy[];
  policyVersion?: PolicyVersion;
  pendingExecutions?: PendingExecution[];
  reconciliations?: ReconciliationResult[];
  chainVerification?: { valid: boolean; eventCount: number; error?: string };
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

// Liquidation
export interface LiquidationEstimate {
  liquidationPrice: number;
  currentPrice: number;
  distancePercent: number; // how far current price is from liquidation (positive = safe)
  classification: LiquidationClassification;
  formula: string; // human-readable description of how it was computed
  maintenanceMarginRate: number;
}

// Policy-as-Code
export interface PolicyVersion {
  version: string;
  hash: string; // SHA-256 of serialized config
  config: RiskConfig;
  timestamp: number;
  createdBy: 'OPERATOR' | 'SYSTEM_DEFAULT';
}

// Pending Execution (Execution Gate)
export interface PendingExecution {
  id: string;
  proposal: AllocationProposal;
  refereeDecision: RefereeDecision;
  orderPreview: OrderPreview;
  postTradeProjection: PostTradeProjection;
  policyVersion: PolicyVersion;
  createdAt: number;
  expiresAt: number;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
}

export interface PostTradeProjection {
  projectedTotalCapital: number;
  projectedAvailableCapital: number;
  projectedAllocatedCapital: number;
  projectedLeverage: number;
  projectedNetExposure: number;
  projectedLiquidationDistance: number | null;
  projectedConcentration: Record<string, number>;
}

// Execution Confirmation
export interface ExecutionConfirmation {
  pendingExecutionId: string;
  confirmedAt: number;
  confirmedBy: 'OPERATOR';
  executionResult: ExecutionResult | null;
}

// Post-Trade Reconciliation
export interface ReconciliationResult {
  orderId: string;
  expectedPrice: number;
  actualPrice: number;
  priceDelta: number;
  priceSlippagePercent: number;
  expectedFee: number;
  actualFee: number;
  feeDelta: number;
  expectedQuantity: number;
  actualQuantity: number;
  quantityDelta: number;
  totalCostDelta: number;
  status: 'MATCHED' | 'MINOR_DISCREPANCY' | 'MAJOR_DISCREPANCY';
  details: string;
}
