'use client';

import React from 'react';
import { useAtlasState } from '@/hooks/useAtlasState';
import { formatPercent, formatCurrency } from '@/lib/utils';
import { Microscope, CheckCircle, AlertTriangle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';

export default function AutopsyPage() {
  const { state, loading, triggerCycle } = useAtlasState(5000);

  const autopsies = state?.autopsies || [];
  const positions = state?.positions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Microscope className="w-6 h-6 text-indigo-400" />
            Allocation Autopsy & Post-Mortem Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quantitative retrospective on capital deployments — comparing expected outcomes against realized returns, market fragility drift, and cost drag.
          </p>
        </div>
        <button
          onClick={triggerCycle}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-200 text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Run Audit Cycle
        </button>
      </div>

      {/* Core Concept Banner */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">The ATLAS Retrospective Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
            <span className="text-indigo-400 font-semibold block mb-1">1. Thesis vs Reality</span>
            Did the market follow the original opportunity hypothesis, or did unanticipated fragility invalidate it?
          </div>
          <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
            <span className="text-indigo-400 font-semibold block mb-1">2. Cost & Slippage Drag</span>
            How much alpha was lost to maker/taker fees, order book depth resistance, and execution delay?
          </div>
          <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
            <span className="text-indigo-400 font-semibold block mb-1">3. Opportunity Missed</span>
            Did another candidate asset or holding cash outperform the selected allocation during the hold period?
          </div>
        </div>
      </div>

      {/* Active Position Autopsies */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Live Allocation Diagnostic Cards</h2>

        {positions.length === 0 && autopsies.length === 0 ? (
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-12 text-center">
            <Microscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Historical Allocations to Analyze</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Execute a capital cycle from the Command Center or trigger an opportunity to begin generating real-time allocation autopsies.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {positions.map((pos) => {
              const autopsy = autopsies.find((a) => a.positionId === pos.id) || {
                positionId: pos.id,
                expectedReturn: 0.035,
                realizedReturn: pos.unrealizedPnlPercent,
                expectedRisk: 0.05,
                realizedRisk: Math.abs(Math.min(0, pos.unrealizedPnlPercent)),
                executionCost: pos.allocationUsd * 0.001,
                slippage: pos.allocationUsd * 0.0005,
                opportunityMissed: 0.008,
                fragilityChange: 0.04,
                decisionQuality: pos.unrealizedPnlPercent >= 0 ? 'GOOD' : 'FAIR',
                analysis: `Active allocation monitoring: Position is ${pos.thesisStatus}. Realized ${pos.unrealizedPnlPercent >= 0 ? '+' : ''}${(pos.unrealizedPnlPercent * 100).toFixed(2)}% PnL against +3.50% expected return.`
              };

              const qualityColor =
                autopsy.decisionQuality === 'EXCELLENT'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : autopsy.decisionQuality === 'GOOD'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : autopsy.decisionQuality === 'FAIR'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30';

              return (
                <div key={pos.id} className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">{pos.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {pos.direction} {pos.leverage}x
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${qualityColor}`}>
                        DECISION QUALITY: {autopsy.decisionQuality}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Allocated Capital</span>
                      <span className="text-sm font-mono font-bold text-white">{formatCurrency(pos.allocationUsd)}</span>
                    </div>
                  </div>

                  {/* Quantitative Comparison Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Expected Return</span>
                      <span className="text-sm font-mono font-semibold text-slate-300">+{formatPercent(autopsy.expectedReturn)}</span>
                    </div>
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Realized Return</span>
                      <span className={`text-sm font-mono font-semibold ${autopsy.realizedReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {autopsy.realizedReturn >= 0 ? '+' : ''}{formatPercent(autopsy.realizedReturn)}
                      </span>
                    </div>
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Execution Drag</span>
                      <span className="text-sm font-mono font-semibold text-amber-400">{formatCurrency(autopsy.executionCost + autopsy.slippage)}</span>
                    </div>
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Opportunity Drag</span>
                      <span className="text-sm font-mono font-semibold text-slate-300">-{formatPercent(autopsy.opportunityMissed)}</span>
                    </div>
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Fragility Drift</span>
                      <span className="text-sm font-mono font-semibold text-slate-300">
                        {autopsy.fragilityChange > 0 ? '+' : ''}{(autopsy.fragilityChange * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
                      <span className="text-[11px] text-slate-500 block uppercase">Thesis Status</span>
                      <span className={`text-sm font-semibold ${pos.thesisStatus === 'VALID' ? 'text-emerald-400' : pos.thesisStatus === 'DETERIORATING' ? 'text-amber-400' : 'text-red-400'}`}>
                        {pos.thesisStatus}
                      </span>
                    </div>
                  </div>

                  {/* Autopsy Text Diagnostics */}
                  <div className="bg-[#0a0e17] p-3.5 rounded-lg border border-[#1e293b] text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-indigo-400 block mb-1">Diagnostic Autopsy Findings:</span>
                    {autopsy.analysis}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
