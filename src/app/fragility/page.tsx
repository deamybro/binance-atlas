'use client';

import React, { useEffect, useState } from 'react';
import { FragilityAssessment } from '@/core/types';
import { formatPercent } from '@/lib/utils';

export default function FragilityPage() {
  const [fragility, setFragility] = useState<FragilityAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/atlas/state');
      const data = await res.json();
      if (data.fragility) {
        setFragility(data.fragility);
      }
    } catch (error) {
      console.error('Error fetching fragility:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'MODERATE': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'HIGH': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      case 'EXTREME': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-slate-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'WORSENING': return <span className="text-red-400">↑ Worsening</span>;
      case 'STABLE': return <span className="text-slate-400">→ Stable</span>;
      case 'IMPROVING': return <span className="text-emerald-400">↓ Improving</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 text-slate-200 min-h-screen bg-[#0a0e17]">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Market Fragility</h1>

      {loading ? (
        <div className="text-slate-400">Loading fragility data...</div>
      ) : !fragility ? (
        <div className="text-slate-400">No fragility data available.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-[#111827] border border-[#1e293b] rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Overall Score</div>
            <div className="relative flex items-center justify-center mb-6">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" className="stroke-slate-800" strokeWidth="12" fill="none" />
                <circle cx="96" cy="96" r="88" className="stroke-current text-amber-500" strokeWidth="12" fill="none" strokeDasharray={`${fragility.score * 553} 553`} />
              </svg>
              <div className="absolute text-5xl font-bold text-white font-mono">
                {Math.round(fragility.score * 100)}
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getLevelColor(fragility.level)}`}>
                {fragility.level}
              </span>
              <span className="font-semibold text-sm bg-[#1e293b] px-3 py-1.5 rounded-full">
                {getTrendIcon(fragility.trend)}
              </span>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 bg-[#111827] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Component Breakdown</h2>
            <div className="space-y-6">
              {fragility.components?.map((comp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-200">{comp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono tracking-widest uppercase">
                        {comp.source}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{formatPercent(comp.value)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full ${comp.value > 0.7 ? 'bg-red-500' : comp.value > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${comp.value * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 bg-[#111827] border border-[#1e293b] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Estimated Liquidation Pressure</h2>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono uppercase">ESTIMATED</span>
            </div>
            
            <div className="relative h-24 bg-[#0a0e17] rounded-lg border border-slate-800 overflow-hidden flex items-center px-4">
              <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-red-500/20 to-transparent"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/20 to-transparent"></div>
              
              <div className="w-full relative h-full flex items-center">
                <div className="absolute left-[20%] flex flex-col items-center">
                  <div className="h-full w-px bg-red-500/50 absolute -z-10"></div>
                  <div className="text-xs text-red-400 font-mono mt-16 whitespace-nowrap">High Long Liq Risk</div>
                </div>
                
                <div className="absolute left-[50%] flex flex-col items-center -translate-x-1/2">
                  <div className="w-4 h-4 bg-white rounded-full border-4 border-blue-500 z-10 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="text-xs text-white font-mono mt-2 bg-[#111827] px-2 py-0.5 rounded border border-slate-700">Current Price</div>
                </div>
                
                <div className="absolute right-[20%] flex flex-col items-center">
                  <div className="h-full w-px bg-emerald-500/50 absolute -z-10"></div>
                  <div className="text-xs text-emerald-400 font-mono mt-16 whitespace-nowrap">High Short Liq Risk</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
