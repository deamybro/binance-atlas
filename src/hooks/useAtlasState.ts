import { useState, useEffect, useCallback } from 'react';
import type { AtlasState } from '@/core/types';

export function useAtlasState(refreshInterval: number = 0) {
  const [state, setState] = useState<AtlasState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/atlas/state');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerCycle = useCallback(async () => {
    try {
      await fetch('/api/atlas/cycle', { method: 'POST' });
      await fetchState();
    } catch (err) {
      console.error('Failed to trigger cycle:', err);
    }
  }, [fetchState]);

  const setScenario = useCallback(async (scenario: string) => {
    try {
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      await fetchState();
    } catch (err) {
      console.error('Failed to set scenario:', err);
    }
  }, [fetchState]);

  useEffect(() => {
    fetchState();
    if (refreshInterval > 0) {
      const interval = setInterval(fetchState, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchState, refreshInterval]);

  return { state, loading, error, refresh: fetchState, triggerCycle, setScenario };
}
