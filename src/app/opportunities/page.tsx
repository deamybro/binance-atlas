'use client';

import React, { useEffect, useState } from 'react';
import { Opportunity, AtlasCycleResult } from '@/core/types';
import { formatPercent } from '@/lib/utils';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/atlas/state');
      const data = await res.json();
      if (data.lastCycleResult?.opportunities) {
        setOpportunities(data.lastCycleResult.opportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCycle = async () => {
    setRunning(true);
    try {
      await fetch('/api/atlas/cycle', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error running cycle:', error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 text-slate-200 min-h-screen bg-[#0a0e17]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Opportunity Candidates</h1>
        <button
          onClick={runCycle}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-medium text-sm border border-emerald-500/50 transition-colors disabled:opacity-50"
        >
          {running ? 'Running Cycle...' : 'Run Cycle'}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading opportunities...</div>
      ) : opportunities.length === 0 ? (
        <div className="text-slate-400 p-8 border border-slate-800 bg-[#111827] rounded-lg">No candidates found in last cycle.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {opportunities.map((opp, idx) => (
            <div key={opp.id || idx} className="bg-[#111827] border border-[#1e293b] rounded-lg p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{opp.name}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{opp.type}</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{opp.asset}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-xl font-bold ${opp.finalAdvantage > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(opp.finalAdvantage)}
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Final Advantage</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-[#0a0e17] p-3 rounded border border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase">Expected Return</div>
                  <div className={`font-mono ${opp.expectedReturn > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(opp.expectedReturn)}
                  </div>
                </div>
                <div className="bg-[#0a0e17] p-3 rounded border border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase">Expected Risk</div>
                  <div className="font-mono text-amber-400">{formatPercent(opp.expectedRisk)}</div>
                </div>
                <div className="bg-[#0a0e17] p-3 rounded border border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase">Execution Cost</div>
                  <div className="font-mono text-red-400/80">-{formatPercent(opp.executionCost + opp.slippageCost)}</div>
                </div>
                <div className="bg-[#0a0e17] p-3 rounded border border-slate-800/50">
                  <div className="text-xs text-slate-500 uppercase">Fragility Penalty</div>
                  <div className="font-mono text-orange-400/80">-{formatPercent(opp.fragilityPenalty)}</div>
                </div>
              </div>
              
              <div className="mt-2 text-sm text-slate-400 border-t border-slate-800 pt-3">
                <span className="inline-block px-2 py-1 rounded-md text-xs font-semibold bg-slate-800/80 text-slate-300 mr-2">
                  {opp.source}
                </span>
                {opp.finalAdvantage <= 0 ? 'Loses edge after costs and penalties.' : 'Maintains edge after costs.'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
