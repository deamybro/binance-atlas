'use client';

import React from 'react';
import { useAtlasState } from '@/hooks/useAtlasState';
import { formatPercent, formatCurrency } from '@/lib/utils';
import { GitGraph, ArrowRight, Shield, Zap, TrendingUp, Lock, RefreshCw } from 'lucide-react';

export default function CapitalGraphPage() {
  const { state, loading, triggerCycle } = useAtlasState(5000);

  const opportunities = state?.opportunities || [];
  const selectedOpp = state?.lastCycleResult?.selectedOpportunity || opportunities[0];
  const capital = state?.capital || { total: 100000, available: 100000, allocated: 0, atRisk: 0 };
  const fragility = state?.fragility || { score: 0.2, level: 'LOW' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitGraph className="w-6 h-6 text-emerald-400" />
            Capital Opportunity Graph & Routing Topology
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visual dynamic routing graph mapping capital flow from source to competing destinations, with explicit cost, fragility, and incremental advantage edge weights.
          </p>
        </div>
        <button
          onClick={triggerCycle}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600/30 border border-emerald-500/50 hover:bg-emerald-600/50 text-emerald-200 text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Re-evaluate Graph
        </button>
      </div>

      {/* Main Graph Visualization Canvas */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
          {/* Source Node: Capital Pool */}
          <div className="w-full lg:w-72 bg-[#0a0e17] border-2 border-indigo-500/50 rounded-xl p-5 shadow-lg shadow-indigo-500/10 text-center">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">CAPITAL ROOT</span>
            <div className="text-2xl font-mono font-extrabold text-white">{formatCurrency(capital.total)}</div>
            <div className="mt-3 pt-3 border-t border-[#1e293b] text-xs text-slate-400 flex justify-between">
              <span>Available: <strong className="text-slate-200">{formatCurrency(capital.available)}</strong></span>
              <span>Allocated: <strong className="text-slate-200">{formatCurrency(capital.allocated)}</strong></span>
            </div>
          </div>

          {/* Flow Indicator */}
          <div className="hidden lg:flex flex-col items-center justify-center text-slate-500">
            <span className="text-xs font-mono mb-1 text-slate-400">OPPORTUNITY COST EVALUATION</span>
            <div className="w-24 h-0.5 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>
            <ArrowRight className="w-5 h-5 text-emerald-400 mt-1" />
          </div>

          {/* Destination Nodes: Opportunities */}
          <div className="w-full lg:w-2/3 space-y-3">
            {opportunities.map((opp) => {
              const isSelected = selectedOpp?.id === opp.id;
              const isHold = opp.type === 'HOLD';

              return (
                <div
                  key={opp.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : isHold
                      ? 'bg-[#0a0e17] border-slate-700'
                      : 'bg-[#0a0e17] border-[#1e293b] opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                        {opp.asset.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{opp.name}</span>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[10px] font-bold">
                              OPTIMAL ROUTE
                            </span>
                          )}
                          {isHold && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]">
                              CURRENT ALLOCATION
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">Type: {opp.type}</span>
                      </div>
                    </div>

                    {/* Edge Metric Breakdown */}
                    <div className="grid grid-cols-4 gap-2 text-right">
                      <div className="bg-[#111827] px-2.5 py-1 rounded border border-[#1e293b]">
                        <span className="text-[10px] text-slate-500 block">Gross Return</span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {opp.expectedReturn > 0 ? '+' : ''}{formatPercent(opp.expectedReturn)}
                        </span>
                      </div>
                      <div className="bg-[#111827] px-2.5 py-1 rounded border border-[#1e293b]">
                        <span className="text-[10px] text-slate-500 block">Execution Drag</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          -{formatPercent(opp.executionCost + opp.slippageCost)}
                        </span>
                      </div>
                      <div className="bg-[#111827] px-2.5 py-1 rounded border border-[#1e293b]">
                        <span className="text-[10px] text-slate-500 block">Fragility Drag</span>
                        <span className="text-xs font-mono font-bold text-orange-400">
                          -{formatPercent(opp.fragilityPenalty)}
                        </span>
                      </div>
                      <div className={`px-2.5 py-1 rounded border ${isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#111827] border-[#1e293b] text-slate-300'}`}>
                        <span className="text-[10px] block opacity-75">Net Advantage</span>
                        <span className="text-xs font-mono font-bold">
                          {opp.finalAdvantage > 0 ? '+' : ''}{formatPercent(opp.finalAdvantage)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Why ATLAS Routes Capital Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Routing Logic & Graph Explanation
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          The Capital Opportunity Graph computes all viable paths for capital deployment. Unlike traditional systems that route based purely on headline momentum, ATLAS weights each edge with deterministic fee drag, liquidity resistance, and observed market fragility. If no edge delivers a positive net incremental advantage over the root holding position, capital flow remains <strong>LOCKED</strong> in place.
        </p>
      </div>
    </div>
  );
}
