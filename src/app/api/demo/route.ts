import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function POST(request: Request) {
  try {
    const { scenario } = await request.json();
    
    if (!['NORMAL', 'FRAGILITY_SPIKE', 'CASCADE', 'EXHAUSTION', 'RECOVERY'].includes(scenario)) {
      return NextResponse.json({ error: 'Invalid scenario' }, { status: 400 });
    }
    
    const orchestrator = getOrchestrator();
    
    // Assuming setDemoScenario exists on the orchestrator
    if ('setDemoScenario' in orchestrator && typeof orchestrator.setDemoScenario === 'function') {
      await orchestrator.setDemoScenario(scenario);
    }
    
    const cycleResult = await orchestrator.runCycle();
    
    return NextResponse.json(cycleResult);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to run demo scenario' }, { status: 500 });
  }
}
