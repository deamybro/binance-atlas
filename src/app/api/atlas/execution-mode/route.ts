import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orchestrator = getOrchestrator();

    if (body.executionMode) {
      orchestrator.setExecutionMode(body.executionMode);
    }

    if (body.apiKey && body.apiSecret) {
      orchestrator.setBinanceCredentials(body.apiKey, body.apiSecret, Boolean(body.useTestnet));
    }

    return NextResponse.json({
      success: true,
      state: orchestrator.getState()
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update execution settings' }, { status: 500 });
  }
}
