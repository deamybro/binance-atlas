'use client';

import React, { useEffect, useState } from 'react';
import { Position } from '@/core/types';
import { formatPercent, formatCurrency } from '@/lib/utils';

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/atlas/state');
      const data = await res.json();
      if (data.positions) {
        setPositions(data.positions);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThesisBadge = (status: string) => {
    switch (status) {
      case 'VALID': return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">VALID</span>;
      case 'DETERIORATING': return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">DETERIORATING</span>;
      case 'INVALIDATED': return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">INVALIDATED</span>;
      default: return <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="p-6 text-slate-200 min-h-screen bg-[#0a0e17]">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-6">Active Positions</h1>

      {loading ? (
        <div className="text-slate-400">Loading positions...</div>
      ) : positions.length === 0 ? (
        <div className="text-slate-400 p-8 border border-slate-800 bg-[#111827] rounded-lg text-center font-medium">No active positions</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Symbol</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Direction</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Entry / Current</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">PnL</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Allocation</th>
                  <th className="px-6 py-4 border-b border-[#1e293b]">Thesis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{pos.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${pos.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.direction} <span className="text-slate-500 font-normal text-xs ml-1">{pos.leverage}x</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div className="text-slate-300">{formatCurrency(pos.entryPrice)}</div>
                      <div className="text-slate-500 text-xs">{formatCurrency(pos.currentPrice)}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div className={`font-bold ${pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(pos.unrealizedPnl)}
                      </div>
                      <div className={`text-xs ${pos.unrealizedPnlPercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {formatPercent(pos.unrealizedPnlPercent)}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{formatCurrency(pos.allocationUsd)}</td>
                    <td className="px-6 py-4">
                      {getThesisBadge(pos.thesisStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positions.filter(p => p.thesisStatus !== 'VALID').map(pos => (
              <div key={`thesis-${pos.id}`} className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-amber-500">{pos.symbol} Thesis Update</span>
                  {getThesisBadge(pos.thesisStatus)}
                </div>
                <p className="text-sm text-amber-200/80">{pos.thesisReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
