import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const fragility = state.fragility;
    return NextResponse.json(fragility);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to get fragility assessment' }, { status: 500 });
  }
}
