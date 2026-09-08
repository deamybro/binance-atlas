import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const positions = state.positions || [];
    return NextResponse.json(positions);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to get positions' }, { status: 500 });
  }
}
