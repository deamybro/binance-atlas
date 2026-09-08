import { describe, it, expect, beforeEach } from 'vitest';
import { AtlasOrchestrator } from '../atlas-orchestrator';
import { MultiMarketSnapshot } from '../../types';

describe('Fail-Closed Enforcement & Orchestrator Flow', () => {
  let orchestrator: AtlasOrchestrator;

  beforeEach(() => {
    orchestrator = new AtlasOrchestrator(100_000);
    orchestrator.setDataSourceMode('DEMO_SCENARIO');
  });

  it('enforces fail-closed when market snapshot is flagged as stale', async () => {
    const staleSnapshot: MultiMarketSnapshot = {
      snapshots: {
        BTC: {
          symbol: 'BTC',
          price: { value: 65000, source: 'OBSERVED', timestamp: Date.now() - 60000, age: 60000, freshness: 'STALE', status: 'AVAILABLE' },
          priceChange24h: { value: 500, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          priceChangePercent24h: { value: 1.2, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          volume24h: { value: 10000, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          high24h: { value: 66000, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          low24h: { value: 64000, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          volatility: { value: 0.02, source: 'DERIVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          fundingRate: { value: 0.0001, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          openInterest: { value: 5000, source: 'OBSERVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          liquidationActivity: { value: 10, source: 'ESTIMATED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          liquidityDepth: { value: 5000000, source: 'DERIVED', timestamp: Date.now(), age: 0, freshness: 'FRESH', status: 'AVAILABLE' },
          timestamp: Date.now() - 60000,
          isStale: true,
        }
      },
      timestamp: Date.now() - 60000,
      isStale: true,
    };

    const cycleResult = await orchestrator.runCycle(staleSnapshot);

    expect(cycleResult.failClosed).toBe(true);
    expect(cycleResult.decision.action).toContain('HOLD (FAIL-CLOSED');
    expect(cycleResult.execution).toBeNull();
    expect(cycleResult.pendingExecution).toBeNull();

    // Verify FAIL_CLOSED event logged in journal
    const journal = orchestrator.getJournal();
    const failClosedEvent = journal.find(e => e.type === 'FAIL_CLOSED');
    expect(failClosedEvent).toBeDefined();
    expect(failClosedEvent?.title).toContain('Fail-Closed Gate Activated');
  });

  it('stages approved trade as pending execution requiring operator confirmation', async () => {
    orchestrator.setRequireOperatorConfirmation(true);
    orchestrator.setDemoScenario('NORMAL');

    const cycleResult = await orchestrator.runCycle();

    if (cycleResult.proposal && cycleResult.refereeDecision?.decision === 'ALLOW') {
      expect(cycleResult.pendingExecution).toBeDefined();
      expect(cycleResult.execution).toBeNull();
      expect(cycleResult.decision.action).toContain('AWAITING OPERATOR CONFIRMATION');

      const activePending = orchestrator.getActivePendingExecutions();
      expect(activePending.length).toBeGreaterThan(0);

      // Confirm execution as operator
      const pendingId = cycleResult.pendingExecution!.id;
      const { execution, reconciliation } = await orchestrator.confirmExecution(pendingId);

      expect(execution).toBeDefined();
      expect(execution.executedQuantity).toBeGreaterThan(0);
      expect(reconciliation).toBeDefined();
      expect(['MATCHED', 'MINOR_DISCREPANCY']).toContain(reconciliation.status);

      // Verify operator confirmation was journaled
      const confirmedEvents = orchestrator.getJournal().filter(e => e.type === 'OPERATOR_CONFIRMED');
      expect(confirmedEvents.length).toBeGreaterThan(0);
    }
  });

  it('updates policy and tracks policy hash across decisions and journal entries', () => {
    const initialPolicy = orchestrator.getCurrentPolicy();
    expect(initialPolicy.version).toBe('v1.0');

    // Operator updates policy
    const newPolicy = orchestrator.setRiskConfig({
      ...orchestrator.getRiskConfig(),
      maxLeverage: 2,
    });

    expect(newPolicy.version).toBe('v2.0');
    expect(newPolicy.hash).not.toBe(initialPolicy.hash);

    // Verify journal verification is valid after policy updates
    const verification = orchestrator.verifyJournalChain();
    expect(verification.valid).toBe(true);
  });
});
