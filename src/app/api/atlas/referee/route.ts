import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';
import { evaluateProposal } from '@/core/referee/risk-referee';
import type { PortfolioState, FragilityAssessment } from '@/core/types';

export async function POST(request: Request) {
  try {
    const proposal = await request.json();
    const orchestrator = getOrchestrator();
    
    const state = orchestrator.getState();
    const riskConfig = orchestrator.getRiskConfig();
    const fragility: FragilityAssessment = state.fragility;
    const portfolio: PortfolioState = {
      totalCapital: state.capital.total,
      availableCapital: state.capital.available,
      allocatedCapital: state.capital.allocated,
      atRiskCapital: state.capital.atRisk,
      positions: state.positions,
      timestamp: Date.now(),
    };
    
    const refereeResult = evaluateProposal(proposal, portfolio, fragility, riskConfig, 0);
    return NextResponse.json(refereeResult);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to evaluate proposal' }, { status: 500 });
  }
}
