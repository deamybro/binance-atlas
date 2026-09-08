import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const pending = orchestrator.getActivePendingExecutions();
    return NextResponse.json({
      pendingExecutions: pending,
      count: pending.length,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve pending executions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pendingExecutionId, action = 'CONFIRM', reason } = body;

    if (!pendingExecutionId) {
      return NextResponse.json({ error: 'Missing pendingExecutionId parameter' }, { status: 400 });
    }

    const orchestrator = getOrchestrator();

    if (action === 'CANCEL') {
      orchestrator.cancelPendingExecution(pendingExecutionId, reason);
      return NextResponse.json({
        success: true,
        action: 'CANCELLED',
        pendingExecutionId,
      });
    }

    // Explicit operator confirmation
    const result = await orchestrator.confirmExecution(pendingExecutionId);
    return NextResponse.json({
      success: true,
      action: 'EXECUTED',
      pendingExecutionId,
      execution: result.execution,
      reconciliation: result.reconciliation,
    });
  } catch (error: any) {
    console.error('Execution Gate Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to process execution confirmation',
      success: false
    }, { status: 400 });
  }
}
