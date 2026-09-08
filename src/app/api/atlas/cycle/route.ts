import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orchestrator = getOrchestrator();

    if (body.dataSource === 'LIVE_BINANCE') {
      orchestrator.setDataSourceMode('LIVE_BINANCE');
    } else if (body.dataSource === 'DEMO_SCENARIO' || body.scenario) {
      if (body.scenario) {
        orchestrator.setDemoScenario(body.scenario);
      } else {
        orchestrator.setDataSourceMode('DEMO_SCENARIO');
      }
    }

    const cycleResult = await orchestrator.runCycle();
    return NextResponse.json(cycleResult);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to run ATLAS cycle' }, { status: 500 });
  }
}
