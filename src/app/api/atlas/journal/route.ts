import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const verifyParam = searchParams.get('verify');
    const exportParam = searchParams.get('export');
    const limitParam = searchParams.get('limit');
    
    const orchestrator = getOrchestrator();

    if (verifyParam === 'true') {
      const verification = orchestrator.verifyJournalChain();
      return NextResponse.json(verification);
    }

    if (exportParam === 'true') {
      const chain = orchestrator.getJournalChain();
      return NextResponse.json({
        chain,
        count: chain.length,
        verified: orchestrator.verifyJournalChain(),
      });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const journalEvents = orchestrator.getJournal();
    
    if (limit && !isNaN(limit)) {
      return NextResponse.json(journalEvents.slice(0, limit));
    }
    
    return NextResponse.json(journalEvents);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to get journal events' }, { status: 500 });
  }
}

