import { Position, AllocationAutopsy, MarketSnapshot, FragilityAssessment, Opportunity } from '../types';

export interface AutopsyEvaluationInput {
  position: Position;
  currentMarket: MarketSnapshot;
  initialFragilityScore: number;
  currentFragility: FragilityAssessment;
  alternativeOpportunities?: Opportunity[];
}

export class AutopsyEngine {
  /**
   * Conducts a quantitative post-mortem / autopsy on an active or closed allocation.
   */
  evaluatePosition(input: AutopsyEvaluationInput): AllocationAutopsy {
    const { position, currentMarket, initialFragilityScore, currentFragility, alternativeOpportunities } = input;

    const expectedReturn = 0.035; // benchmark thesis return
    const expectedRisk = position.allocationUsd > 0 ? (position.allocationUsd * 0.05) / position.allocationUsd : 0.05;
    const realizedReturn = position.unrealizedPnlPercent;
    const realizedRisk = Math.abs(Math.min(0, realizedReturn));

    const executionCost = position.allocationUsd * 0.001; // ~0.1% typical fee
    const slippage = position.allocationUsd * 0.0005; // ~0.05% slippage

    const fragilityChange = currentFragility.score - initialFragilityScore;

    // Determine what best alternative did
    let bestAlternativeReturn = 0;
    if (alternativeOpportunities && alternativeOpportunities.length > 0) {
      bestAlternativeReturn = Math.max(...alternativeOpportunities.map(o => o.expectedReturn));
    }
    const opportunityMissed = Math.max(0, bestAlternativeReturn - realizedReturn);

    // Score decision quality
    let decisionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
    if (realizedReturn > expectedReturn * 0.8 && fragilityChange <= 0.1) {
      decisionQuality = 'EXCELLENT';
    } else if (realizedReturn >= 0 && fragilityChange < 0.25) {
      decisionQuality = 'GOOD';
    } else if (realizedReturn < 0 && fragilityChange > 0.3) {
      decisionQuality = 'FAIR'; // market shifted against thesis
    } else if (realizedReturn < -0.05 && opportunityMissed > 0.05) {
      decisionQuality = 'POOR';
    }

    // Build structured diagnostic analysis
    const isThesisValid = position.thesisStatus === 'VALID';
    const analysis = [
      `Thesis Evaluation: ${isThesisValid ? 'The macro thesis held.' : `Thesis invalidated: ${position.thesisReason}`}`,
      `Return Attribution: Realized ${(realizedReturn * 100).toFixed(2)}% vs Expected +${(expectedReturn * 100).toFixed(2)}%.`,
      `Fragility Impact: Market fragility shifted by ${(fragilityChange > 0 ? '+' : '')}${(fragilityChange * 100).toFixed(1)}% since entry.`,
      `Cost Drag: Incurred $${executionCost.toFixed(2)} fees + $${slippage.toFixed(2)} estimated slippage.`,
      `Opportunity Comparison: Opportunity cost drag vs top alternative: ${(opportunityMissed * 100).toFixed(2)}%.`
    ].join(' ');

    return {
      positionId: position.id,
      expectedReturn,
      realizedReturn,
      expectedRisk,
      realizedRisk,
      executionCost,
      slippage,
      opportunityMissed,
      fragilityChange,
      decisionQuality,
      analysis,
    };
  }
}

let autopsyInstance: AutopsyEngine | null = null;
export function getAutopsyEngine(): AutopsyEngine {
  if (!autopsyInstance) {
    autopsyInstance = new AutopsyEngine();
  }
  return autopsyInstance;
}
