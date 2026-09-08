import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function POST() {
  try {
    const orchestrator = getOrchestrator();
    orchestrator.reset(100_000);
    orchestrator.setDataSourceMode('LIVE_BINANCE');
    
    // Run an initial clean cycle
    const initialCycle = await orchestrator.runCycle();
    
    return NextResponse.json({
      success: true,
      message: 'ATLAS state successfully reset to initial clean state ($100k capital, clean journal, LIVE_BINANCE mode).',
      state: orchestrator.getState(),
      initialCycle,
    });
  } catch (error) {
    console.error('Reset Error:', error);
    return NextResponse.json({ error: 'Failed to reset ATLAS state' }, { status: 500 });
  }
}
