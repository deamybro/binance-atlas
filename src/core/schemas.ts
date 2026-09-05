import { z } from 'zod';

export const DataSourceSchema = z.enum(['OBSERVED', 'DERIVED', 'ESTIMATED']);

export const MarketDataPointSchema = z.object({
  value: z.number(),
  source: DataSourceSchema,
  timestamp: z.number(),
  age: z.number(),
});

export const MarketSnapshotSchema = z.object({
  symbol: z.string(),
  price: MarketDataPointSchema,
  priceChange24h: MarketDataPointSchema,
  priceChangePercent24h: MarketDataPointSchema,
  volume24h: MarketDataPointSchema,
  high24h: MarketDataPointSchema,
  low24h: MarketDataPointSchema,
  volatility: MarketDataPointSchema,
  fundingRate: MarketDataPointSchema,
  openInterest: MarketDataPointSchema,
  liquidationActivity: MarketDataPointSchema,
  liquidityDepth: MarketDataPointSchema,
  timestamp: z.number(),
  isStale: z.boolean(),
});

export const MultiMarketSnapshotSchema = z.object({
  snapshots: z.record(z.string(), MarketSnapshotSchema),
  timestamp: z.number(),
  isStale: z.boolean(),
});

export const AtlasModeSchema = z.enum(['OPPORTUNITY', 'DEFENSE', 'HUNT', 'RECOVERY']);

export const PipelineStageSchema = z.enum(['OBSERVE', 'DISCOVER', 'COMPARE', 'PRICE_RISK', 'STRESS', 'REFEREE', 'ALLOCATE', 'MONITOR', 'DEFEND_HUNT', 'RECOVER', 'REALLOCATE']);
export const PipelineStageStatusSchema = z.enum(['PENDING', 'ACTIVE', 'COMPLETE', 'SKIPPED']);

export const PipelineStateSchema = z.object({
  stages: z.array(z.object({
    stage: PipelineStageSchema,
    status: PipelineStageStatusSchema,
    detail: z.string().optional(),
  })),
  currentStage: PipelineStageSchema,
});

export const PositionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number(),
  currentPrice: z.number(),
  size: z.number(),
  allocationUsd: z.number(),
  leverage: z.number(),
  unrealizedPnl: z.number(),
  unrealizedPnlPercent: z.number(),
  openedAt: z.number(),
  thesisStatus: z.enum(['VALID', 'DETERIORATING', 'INVALIDATED']),
  thesisReason: z.string(),
  invalidationConditions: z.array(z.string()),
});

export const PortfolioStateSchema = z.object({
  totalCapital: z.number(),
  availableCapital: z.number(),
  allocatedCapital: z.number(),
  atRiskCapital: z.number(),
  positions: z.array(PositionSchema),
  timestamp: z.number(),
});

export const OpportunityTypeSchema = z.enum(['DIRECTIONAL_LONG', 'DIRECTIONAL_SHORT', 'CARRY', 'BASIS', 'HEDGE', 'DEFENSIVE', 'HOLD', 'POST_DISLOCATION']);

export const OpportunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: OpportunityTypeSchema,
  asset: z.string(),
  expectedReturn: z.number(),
  expectedRisk: z.number(),
  executionCost: z.number(),
  slippageCost: z.number(),
  liquidityScore: z.number(),
  fragilityPenalty: z.number(),
  portfolioImpact: z.number(),
  concentrationPenalty: z.number(),
  opportunityScore: z.number(),
  finalAdvantage: z.number(),
  confidence: z.number(),
  source: DataSourceSchema,
});

export const OpportunityCostAnalysisSchema = z.object({
  currentExpectedValue: z.number(),
  proposedExpectedValue: z.number(),
  incrementalExpectedValue: z.number(),
  executionCost: z.number(),
  slippageCost: z.number(),
  liquidityPenalty: z.number(),
  portfolioRiskPenalty: z.number(),
  fragilityPenalty: z.number(),
  concentrationPenalty: z.number(),
  finalAdvantage: z.number(),
});

export const ProposalDirectionSchema = z.enum(['LONG', 'SHORT', 'HEDGE', 'DEFENSIVE', 'HOLD']);

export const AllocationProposalSchema = z.object({
  id: z.string(),
  asset: z.string(),
  direction: ProposalDirectionSchema,
  allocationUsd: z.number(),
  leverage: z.number(),
  expectedReturn: z.number(),
  expectedRisk: z.number(),
  rationale: z.string(),
  invalidationConditions: z.array(z.string()),
  confidence: z.number(),
  opportunityCost: OpportunityCostAnalysisSchema,
  timestamp: z.number(),
});

export const RefereeDecisionTypeSchema = z.enum(['ALLOW', 'RESIZE', 'DENY']);
export const RuleStatusSchema = z.enum(['PASS', 'WARNING', 'FAIL']);

export const RuleEvaluationSchema = z.object({
  rule: z.string(),
  ruleLabel: z.string(),
  status: RuleStatusSchema,
  currentValue: z.number(),
  limit: z.number(),
  impact: z.string(),
});

export const RefereeDecisionSchema = z.object({
  decision: RefereeDecisionTypeSchema,
  requestedAllocation: z.number(),
  approvedAllocation: z.number(),
  rules: z.array(RuleEvaluationSchema),
  reason: z.string(),
  timestamp: z.number(),
});

export const RiskConfigSchema = z.object({
  maxLeverage: z.number(),
  maxAssetConcentration: z.number(),
  maxTotalExposure: z.number(),
  maxNetExposure: z.number(),
  maxTradeLoss: z.number(),
  dailyLossLimit: z.number(),
  minimumLiquidity: z.number(),
  maxSlippage: z.number(),
  maxFragilityScore: z.number(),
  minAvailableCapital: z.number(),
  maxHuntAllocation: z.number(),
});

export const FragilityLevelSchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);

export const FragilityComponentSchema = z.object({
  name: z.string(),
  value: z.number(),
  weight: z.number(),
  weightedValue: z.number(),
  source: DataSourceSchema,
  description: z.string(),
});

export const FragilityAssessmentSchema = z.object({
  score: z.number(),
  level: FragilityLevelSchema,
  trend: z.enum(['IMPROVING', 'STABLE', 'WORSENING']),
  components: z.array(FragilityComponentSchema),
  previousScore: z.number().nullable(),
  timestamp: z.number(),
});

export const ExecutionModeSchema = z.enum(['PAPER', 'LIVE']);

export const OrderRequestSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.number(),
  price: z.number().optional(),
  leverage: z.number().optional(),
});

export const ApprovedOrderSchema = OrderRequestSchema.extend({
  proposalId: z.string(),
  refereeDecisionId: z.string(),
  approvedAllocation: z.number(),
});

export const OrderPreviewSchema = z.object({
  estimatedPrice: z.number(),
  estimatedFee: z.number(),
  estimatedSlippage: z.number(),
  estimatedTotal: z.number(),
});

export const ExecutionResultSchema = z.object({
  orderId: z.string(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  executedPrice: z.number(),
  executedQuantity: z.number(),
  fee: z.number(),
  slippage: z.number(),
  timestamp: z.number(),
  mode: ExecutionModeSchema,
});

export const AccountStateSchema = z.object({
  totalBalance: z.number(),
  availableBalance: z.number(),
  unrealizedPnl: z.number(),
  marginUsed: z.number(),
  mode: ExecutionModeSchema,
});

export const JournalEventTypeSchema = z.enum(['OBSERVATION', 'FRAGILITY_CHANGE', 'OPPORTUNITY_FOUND', 'OPPORTUNITY_REJECTED', 'PROPOSAL_CREATED', 'REFEREE_DECISION', 'EXECUTION', 'MODE_CHANGE', 'THESIS_UPDATE', 'CYCLE_COMPLETE', 'ERROR', 'DATA_STALE']);

export const JournalEventSchema = z.object({
  id: z.string(),
  type: JournalEventTypeSchema,
  timestamp: z.number(),
  title: z.string(),
  description: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  mode: AtlasModeSchema,
});

export const AtlasDecisionSummarySchema = z.object({
  action: z.string(),
  explanation: z.string(),
  details: z.array(z.string()),
});

export const AtlasCycleResultSchema = z.object({
  cycleId: z.string(),
  timestamp: z.number(),
  mode: AtlasModeSchema,
  previousMode: AtlasModeSchema,
  marketSnapshot: MultiMarketSnapshotSchema,
  portfolioState: PortfolioStateSchema,
  fragility: FragilityAssessmentSchema,
  opportunities: z.array(OpportunitySchema),
  selectedOpportunity: OpportunitySchema.nullable(),
  proposal: AllocationProposalSchema.nullable(),
  refereeDecision: RefereeDecisionSchema.nullable(),
  execution: ExecutionResultSchema.nullable(),
  pipeline: PipelineStateSchema,
  decision: AtlasDecisionSummarySchema,
  journalEvents: z.array(JournalEventSchema),
});

export const AtlasStateSchema = z.object({
  mode: AtlasModeSchema,
  executionMode: ExecutionModeSchema,
  capital: z.object({
    total: z.number(),
    available: z.number(),
    allocated: z.number(),
    atRisk: z.number(),
  }),
  decision: AtlasDecisionSummarySchema,
  fragility: FragilityAssessmentSchema,
  pipeline: PipelineStateSchema,
  positions: z.array(PositionSchema),
  recentJournal: z.array(JournalEventSchema),
  marketSnapshots: z.record(z.string(), MarketSnapshotSchema),
  lastCycleAt: z.number().nullable(),
  timestamp: z.number(),
});

export const DemoScenarioSchema = z.enum(['NORMAL', 'FRAGILITY_SPIKE', 'CASCADE', 'EXHAUSTION', 'RECOVERY']);

export const AllocationAutopsySchema = z.object({
  positionId: z.string(),
  expectedReturn: z.number(),
  realizedReturn: z.number(),
  expectedRisk: z.number(),
  realizedRisk: z.number(),
  executionCost: z.number(),
  slippage: z.number(),
  opportunityMissed: z.number(),
  fragilityChange: z.number(),
  decisionQuality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
  analysis: z.string(),
});

// Infer and export types
export type DataSourceType = z.infer<typeof DataSourceSchema>;
export type MarketDataPointType = z.infer<typeof MarketDataPointSchema>;
export type MarketSnapshotType = z.infer<typeof MarketSnapshotSchema>;
export type MultiMarketSnapshotType = z.infer<typeof MultiMarketSnapshotSchema>;
export type AtlasModeType = z.infer<typeof AtlasModeSchema>;
export type PipelineStageType = z.infer<typeof PipelineStageSchema>;
export type PipelineStageStatusType = z.infer<typeof PipelineStageStatusSchema>;
export type PipelineStateType = z.infer<typeof PipelineStateSchema>;
export type PositionType = z.infer<typeof PositionSchema>;
export type PortfolioStateType = z.infer<typeof PortfolioStateSchema>;
export type OpportunityTypeType = z.infer<typeof OpportunityTypeSchema>;
export type OpportunityType = z.infer<typeof OpportunitySchema>;
export type OpportunityCostAnalysisType = z.infer<typeof OpportunityCostAnalysisSchema>;
export type ProposalDirectionType = z.infer<typeof ProposalDirectionSchema>;
export type AllocationProposalType = z.infer<typeof AllocationProposalSchema>;
export type RefereeDecisionTypeType = z.infer<typeof RefereeDecisionTypeSchema>;
export type RuleStatusType = z.infer<typeof RuleStatusSchema>;
export type RuleEvaluationType = z.infer<typeof RuleEvaluationSchema>;
export type RefereeDecisionType = z.infer<typeof RefereeDecisionSchema>;
export type RiskConfigType = z.infer<typeof RiskConfigSchema>;
export type FragilityLevelType = z.infer<typeof FragilityLevelSchema>;
export type FragilityComponentType = z.infer<typeof FragilityComponentSchema>;
export type FragilityAssessmentType = z.infer<typeof FragilityAssessmentSchema>;
export type ExecutionModeType = z.infer<typeof ExecutionModeSchema>;
export type OrderRequestType = z.infer<typeof OrderRequestSchema>;
export type ApprovedOrderType = z.infer<typeof ApprovedOrderSchema>;
export type OrderPreviewType = z.infer<typeof OrderPreviewSchema>;
export type ExecutionResultType = z.infer<typeof ExecutionResultSchema>;
export type AccountStateType = z.infer<typeof AccountStateSchema>;
export type JournalEventTypeType = z.infer<typeof JournalEventTypeSchema>;
export type JournalEventType = z.infer<typeof JournalEventSchema>;
export type AtlasDecisionSummaryType = z.infer<typeof AtlasDecisionSummarySchema>;
export type AtlasCycleResultType = z.infer<typeof AtlasCycleResultSchema>;
export type AtlasStateType = z.infer<typeof AtlasStateSchema>;
export type DemoScenarioType = z.infer<typeof DemoScenarioSchema>;
export type AllocationAutopsyType = z.infer<typeof AllocationAutopsySchema>;
