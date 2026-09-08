'use client';

import React, { useEffect, useState } from 'react';
import { RefereeDecision, PolicyVersion } from '@/core/types';
import { formatPercent, formatCurrency, formatTime } from '@/lib/utils';
import { Shield, Lock, FileCode, CheckCircle2, AlertTriangle, Cpu, Scale } from 'lucide-react';

export default function RefereePage() {
  const [decision, setDecision] = useState<RefereeDecision | null>(null);
  const [policyVersion, setPolicyVersion] = useState<PolicyVersion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/atlas/state');
      const data = await res.json();
      if (data.policyVersion) {
        setPolicyVersion(data.policyVersion);
      }
      if (data.lastCycleResult?.refereeDecision) {
        setDecision(data.lastCycleResult.refereeDecision);
      } else if (data.decision) {
        // Fallback or active decision
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
      case 'ALLOW': return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALLOW</span>;
      case 'RESIZE': return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">RESIZE</span>;
      case 'DENY': return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">DENY</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-3 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Shield className="text-emerald-400" size={24} />
              Deterministic Risk Referee & Policy Engine
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Immutable mathematical boundary layer. AI proposals cannot bypass or modify these rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <Lock size={13} />
            FAIL-CLOSED ACTIVE
          </span>
        </div>
      </div>

      {/* Active Policy Registry Card */}
      {policyVersion && (
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
          <div className="bg-[#1a2332] px-6 py-4 border-b border-[#1e293b] flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <FileCode className="text-cyan-400" size={20} />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Active Risk Policy Registry
                  <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {policyVersion.version}
                  </span>
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Created by: <span className="text-slate-200">{policyVersion.createdBy}</span> • Updated: {formatTime(policyVersion.timestamp)}
                </div>
              </div>
            </div>
            <div className="bg-[#0a0e17] px-3.5 py-1.5 rounded-lg border border-[#1e293b] flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Policy SHA-256:</span>
              <span className="text-xs font-mono text-cyan-300 font-bold truncate max-w-[220px]" title={policyVersion.hash}>
                {policyVersion.hash}
              </span>
            </div>
          </div>

          {/* Immutable Rule Limits Grid */}
          <div className="p-6">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale size={14} className="text-indigo-400" />
              Active Deterministic Risk Bounds
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <div className="text-slate-500 text-[10px] uppercase">Max Leverage Cap</div>
                <div className="text-lg font-bold text-white mt-1">{policyVersion.config?.maxLeverage || 3}x</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Hard ceiling across all assets</div>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <div className="text-slate-500 text-[10px] uppercase">Asset Concentration</div>
                <div className="text-lg font-bold text-white mt-1">
                  {((policyVersion.config?.maxAssetConcentration || 0.25) * 100).toFixed(0)}% Max
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Per-asset total capital cap</div>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <div className="text-slate-500 text-[10px] uppercase">Portfolio Exposure</div>
                <div className="text-lg font-bold text-white mt-1">
                  {((policyVersion.config?.maxTotalExposure || 0.8) * 100).toFixed(0)}% Max
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Aggregate market risk limit</div>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                <div className="text-slate-500 text-[10px] uppercase">Fragility Cutoff</div>
                <div className="text-lg font-bold text-amber-400 mt-1">
                  {((policyVersion.config?.maxFragilityScore || 0.7) * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Automatic DEFENSE trigger</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Latest Referee Evaluation Section */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#1e293b] bg-slate-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu size={16} className="text-emerald-400" />
              Latest Trade Proposal Audit
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {decision ? decision.reason : 'Waiting for proposal cycle to evaluate...'}
            </p>
          </div>
          <div>
            {decision && getDecisionBadge(decision.decision)}
          </div>
        </div>

        {decision?.decision === 'RESIZE' && (
          <div className="p-4 bg-amber-950/20 border-b border-amber-900/30 flex gap-8">
            <div>
              <div className="text-xs text-amber-500/70 uppercase font-semibold font-mono">Requested Allocation</div>
              <div className="text-base font-mono text-amber-200">{formatCurrency(decision.requestedAllocation)}</div>
            </div>
            <div>
              <div className="text-xs text-emerald-500/70 uppercase font-semibold font-mono">Approved Allocation</div>
              <div className="text-base font-mono text-emerald-400">{formatCurrency(decision.approvedAllocation)}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">Loading referee evaluation...</div>
        ) : !decision ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No trade proposal evaluated in this cycle. Run a cycle to trigger referee evaluation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f172a] text-slate-400 text-[11px] uppercase font-mono border-b border-[#1e293b]">
                <tr>
                  <th className="px-6 py-3">Deterministic Rule</th>
                  <th className="px-6 py-3">Evaluated Value</th>
                  <th className="px-6 py-3">Policy Threshold</th>
                  <th className="px-6 py-3">Referee Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b] font-mono">
                {decision.rules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-300">{rule.ruleLabel}</td>
                    <td className="px-6 py-3 text-slate-200">{rule.currentValue.toFixed(4)}</td>
                    <td className="px-6 py-3 text-slate-400">{rule.limit.toFixed(4)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusColor(rule.status)}`}>
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
        )}
      </div>
    </div>
  );
}

