'use client';

import React, { useEffect, useState } from 'react';
import { RefereeDecision, RuleEvaluation } from '@/core/types';
import { formatPercent, formatCurrency } from '@/lib/utils';

export default function RefereePage() {
  const [decision, setDecision] = useState<RefereeDecision | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/atlas/state');
      const data = await res.json();
      if (data.lastCycleResult?.refereeDecision) {
        setDecision(data.lastCycleResult.refereeDecision);
      }
    } catch (error) {
      console.error('Error fetching referee decision:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'WARNING': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'FAIL': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-slate-400';
    }
  };

  const getDecisionBadge = (type: string) => {
    switch (type) {
      case 'ALLOW': return <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALLOW</span>;
      case 'RESIZE': return <span className="px-3 py-1 rounded-full text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">RESIZE</span>;
      case 'DENY': return <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/30">DENY</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 text-slate-200 min-h-screen bg-[#0a0e17]">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Risk Referee</h1>

      {loading ? (
        <div className="text-slate-400">Loading referee evaluation...</div>
      ) : !decision ? (
        <div className="text-slate-400 p-8 border border-slate-800 bg-[#111827] rounded-lg">No recent referee evaluations found.</div>
      ) : (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-xl max-w-4xl">
          <div className="p-6 border-b border-[#1e293b] bg-slate-900/50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Latest Proposal Evaluation</h2>
              <p className="text-slate-400 text-sm mt-1">{decision.reason}</p>
            </div>
            <div>
              {getDecisionBadge(decision.decision)}
            </div>
          </div>

          {decision.decision === 'RESIZE' && (
            <div className="p-4 bg-amber-950/20 border-b border-amber-900/30 flex gap-8">
              <div>
                <div className="text-xs text-amber-500/70 uppercase font-semibold">Requested Allocation</div>
                <div className="text-lg font-mono text-amber-200">{formatCurrency(decision.requestedAllocation)}</div>
              </div>
              <div>
                <div className="text-xs text-emerald-500/70 uppercase font-semibold">Approved Allocation</div>
                <div className="text-lg font-mono text-emerald-400">{formatCurrency(decision.approvedAllocation)}</div>
              </div>
            </div>
          )}

          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Rule</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Current Value</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Limit</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {decision.rules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-300">{rule.ruleLabel}</td>
                    <td className="px-6 py-4 font-mono">{rule.currentValue.toFixed(4)}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{rule.limit.toFixed(4)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(rule.status)}`}>
                        {rule.status === 'PASS' && '✓ '}
                        {rule.status === 'WARNING' && '⚠ '}
                        {rule.status === 'FAIL' && '✕ '}
                        {rule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
