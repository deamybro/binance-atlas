'use client';

import React, { useState, useEffect } from 'react';
import { useAtlasState } from '@/hooks/useAtlasState';
import { cn, formatCurrency, formatPercent, getModeBadgeColor, getFragilityColor, formatTime } from '@/lib/utils';
import { 
  Activity, ShieldAlert, Cpu, CheckCircle2, Circle, TrendingUp, TrendingDown, 
  Clock, Play, Pause, Radio, Globe, Shield, RefreshCw, CheckSquare, XCircle, 
  Lock, AlertTriangle, ArrowRight, Layers, FileCode
} from 'lucide-react';
import type { AtlasMode, DemoScenario, PipelineStage, PendingExecution } from '@/core/types';

export default function CommandCenter() {
  const { state, loading, error, refresh, triggerCycle, setScenario } = useAtlasState(2500);
  const [autoPilot, setAutoPilot] = useState<boolean>(false);
  const [isLiveBinance, setIsLiveBinance] = useState<boolean>(false);
  const [actingPendingId, setActingPendingId] = useState<string | null>(null);

  // Auto-Pilot cycle runner
  useEffect(() => {
    if (!autoPilot) return;
    const interval = setInterval(() => {
      if (isLiveBinance) {
        fetch('/api/atlas/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataSource: 'LIVE_BINANCE' })
        });
      } else {
        triggerCycle();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [autoPilot, isLiveBinance, triggerCycle]);

  const toggleDataSource = async (live: boolean) => {
    setIsLiveBinance(live);
    if (live) {
      await fetch('/api/atlas/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSource: 'LIVE_BINANCE' })
      });
    } else {
      await fetch('/api/atlas/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSource: 'DEMO_SCENARIO', scenario: 'NORMAL' })
      });
    }
  };

  const handleConfirmExecution = async (pendingId: string) => {
    try {
      setActingPendingId(pendingId);
      const res = await fetch('/api/atlas/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingExecutionId: pendingId, action: 'CONFIRM' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to confirm execution');
      }
      await refresh();
    } catch (err: any) {
      alert(err.message || 'Execution error');
    } finally {
      setActingPendingId(null);
    }
  };

  const handleCancelExecution = async (pendingId: string) => {
    try {
      setActingPendingId(pendingId);
      await fetch('/api/atlas/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingExecutionId: pendingId, action: 'CANCEL', reason: 'Operator rejected from Command Center' }),
      });
      await refresh();
    } catch (err: any) {
      alert(err.message || 'Cancellation error');
    } finally {
      setActingPendingId(null);
    }
  };

  if (loading && !state) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="animate-pulse text-emerald-400" size={32} />
          <p className="text-slate-400 font-mono text-sm">INITIALIZING ATLAS CORE ENGINES...</p>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-2xl">
          <h2 className="text-red-400 font-bold mb-2 flex items-center gap-2">
            <ShieldAlert size={20} />
            SYSTEM ERROR
          </h2>
          <p className="text-slate-300 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">ATLAS Command Center</h1>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono">
              v2.6 PRODUCTION
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 mt-1">
            <span>Autonomous Capital-Allocation Engine</span>
            <span>•</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <FileCode size={12} />
              Policy: {state.policyVersion?.version || 'v1.0'} ({state.policyVersion?.hash.substring(0, 8)}...)
            </span>
            <span>•</span>
            <span className={state.chainVerification?.valid ? 'text-emerald-400' : 'text-amber-400'}>
              Ledger: {state.chainVerification?.valid ? 'VERIFIED ✓' : 'UNVERIFIED'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Source Selector */}
          <div className="flex items-center bg-[#111827] border border-[#1e293b] rounded-lg p-1">
            <button
              onClick={() => toggleDataSource(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors",
                isLiveBinance ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Globe size={13} />
              Live Binance API
            </button>
            <button
              onClick={() => toggleDataSource(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors",
                !isLiveBinance ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Radio size={13} />
              Scenario Lab
            </button>
          </div>

          {/* Auto-Pilot Toggle */}
          <button
            onClick={() => setAutoPilot(!autoPilot)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors",
              autoPilot 
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse" 
                : "bg-[#111827] border-[#1e293b] text-slate-400 hover:text-slate-200"
            )}
          >
            {autoPilot ? <Pause size={14} /> : <Play size={14} />}
            {autoPilot ? 'AUTONOMOUS ACTIVE' : 'AUTONOMOUS PAUSED'}
          </button>

          {/* Mode Pill */}
          <div className="text-right">
            <div className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border font-mono", getModeBadgeColor(state.mode))}>
              MODE: {state.mode}
            </div>
          </div>

          {/* Force Cycle Button */}
          <button 
            onClick={triggerCycle}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Step Cycle
          </button>
        </div>
      </header>

      {/* Capital Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CapitalCard title="Total Capital" value={formatCurrency(state.capital.total)} />
        <CapitalCard title="Available Capital" value={formatCurrency(state.capital.available)} />
        <CapitalCard title="Allocated Capital" value={formatCurrency(state.capital.allocated)} />
        <CapitalCard 
          title="At-Risk Exposure" 
          value={formatCurrency(state.capital.atRisk)} 
          highlight={state.capital.atRisk > state.capital.total * 0.1} 
        />
      </div>

      {/* EXECUTION GATE: Operator Confirmation Stage (Spec Section: Execution Gate) */}
      {state.pendingExecutions && state.pendingExecutions.length > 0 && (
        <section className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl overflow-hidden shadow-lg animate-in fade-in duration-300">
          <div className="bg-amber-500/20 px-5 py-3 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-amber-400" />
              <h2 className="font-mono font-bold text-amber-300 text-sm tracking-wider uppercase">
                Execution Gate: Operator Authorization Required
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/30 text-amber-200 border border-amber-500/40">
              {state.pendingExecutions.length} Trade{state.pendingExecutions.length > 1 ? 's' : ''} Staged
            </span>
          </div>

          <div className="p-5 space-y-4">
            {state.pendingExecutions.map((pending) => (
              <div key={pending.id} className="bg-[#0a0e17] border border-amber-500/30 rounded-lg p-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        pending.proposal.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        pending.proposal.direction === 'SHORT' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {pending.proposal.direction} {pending.proposal.asset}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {pending.id}</span>
                      <span className="text-xs text-slate-400 font-mono">Policy: {pending.policyVersion.version}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{pending.proposal.rationale}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCancelExecution(pending.id)}
                      disabled={actingPendingId === pending.id}
                      className="px-3 py-2 rounded-lg text-xs font-mono font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      Reject / Discard
                    </button>
                    <button
                      onClick={() => handleConfirmExecution(pending.id)}
                      disabled={actingPendingId === pending.id}
                      className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center gap-1.5 animate-pulse hover:animate-none"
                    >
                      <CheckSquare size={14} />
                      {actingPendingId === pending.id ? 'Dispatching...' : 'CONFIRM & EXECUTE'}
                    </button>
                  </div>
                </div>

                {/* Preflight Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                    <div className="text-slate-500 text-[10px] uppercase">Approved Capital</div>
                    <div className="text-white font-bold mt-0.5">${pending.refereeDecision.approvedAllocation.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                    <div className="text-slate-500 text-[10px] uppercase">Est. Fill Price & Fee</div>
                    <div className="text-white font-bold mt-0.5">
                      ${pending.orderPreview.estimatedPrice.toFixed(2)} (Fee: ${pending.orderPreview.estimatedFee.toFixed(2)})
                    </div>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                    <div className="text-slate-500 text-[10px] uppercase">Post-Trade Exposure</div>
                    <div className="text-white font-bold mt-0.5">
                      {(pending.postTradeProjection.projectedNetExposure * 100).toFixed(1)}% ({pending.postTradeProjection.projectedLeverage}x)
                    </div>
                  </div>
                  <div className="bg-[#111827] p-2.5 rounded border border-[#1e293b]">
                    <div className="text-slate-500 text-[10px] uppercase">Liquidation Distance</div>
                    <div className={`font-bold mt-0.5 ${
                      pending.postTradeProjection.projectedLiquidationDistance && pending.postTradeProjection.projectedLiquidationDistance > 15
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}>
                      {pending.postTradeProjection.projectedLiquidationDistance 
                        ? `${pending.postTradeProjection.projectedLiquidationDistance.toFixed(1)}% (ESTIMATE)` 
                        : 'N/A (SPOT)'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Main Dashboard Area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* ATLAS Current Directive Panel */}
          <section className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
            <div className="border-b border-[#1e293b] bg-[#1a2332] px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Shield size={16} className="text-emerald-400" />
                Active Capital Directive & Risk Referee Audit
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Last Evaluated: {state.lastCycleAt ? formatTime(state.lastCycleAt) : 'Ready'}
              </span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-mono font-bold text-white tracking-tight">{state.decision?.action || 'AWAITING CYCLE'}</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {state.decision?.explanation || 'System is currently observing market signals and evaluating capital efficiency.'}
              </p>
              {state.decision?.details && state.decision.details.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1e293b]">
                  {state.decision.details.map((detail, idx) => (
                    <div key={idx} className="bg-[#0a0e17] px-3 py-1.5 rounded border border-[#1e293b] text-xs font-mono text-slate-400">
                      {detail}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Middle Row: Market Telemetry with Provenance & Fragility Meter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Market State with Provenance Badges */}
            <section className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
              <div className="border-b border-[#1e293b] bg-[#1a2332] px-5 py-3 flex justify-between items-center">
                <h2 className="font-semibold text-white text-sm">Market Telemetry & Provenance</h2>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {isLiveBinance ? 'LIVE BINANCE REST' : 'SIMULATION FEED'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                {Object.values(state.marketSnapshots).length > 0 ? (
                  Object.values(state.marketSnapshots).slice(0, 2).map((market) => (
                    <div key={market.symbol} className="bg-[#0a0e17] p-3.5 rounded-lg border border-[#1e293b] flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-base text-white">{market.symbol}</span>
                          {/* Provenance Badges */}
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 font-mono">
                            {market.price.source}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            market.price.freshness === 'FRESH' ? 'bg-emerald-500/20 text-emerald-400' :
                            market.price.freshness === 'AGING' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {market.price.freshness || 'FRESH'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">
                          Vol: {formatPercent(market.volatility.value)} | Funding: {(market.fundingRate.value * 100).toFixed(4)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-bold text-white">{formatCurrency(market.price.value)}</div>
                        <div className={cn(
                          "text-xs font-mono flex items-center justify-end gap-1 mt-0.5",
                          market.priceChangePercent24h.value >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {market.priceChangePercent24h.value >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {market.priceChangePercent24h.value > 0 ? '+' : ''}{formatPercent(market.priceChangePercent24h.value)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 p-4 text-center">Run a cycle to stream live telemetry.</div>
                )}
              </div>
            </section>

            {/* Fragility Summary */}
            <section className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
              <div className="border-b border-[#1e293b] bg-[#1a2332] px-5 py-3 flex justify-between items-center">
                <h2 className="font-semibold text-white text-sm">Estimated Market Fragility</h2>
                <div className={cn("text-xs px-2 py-0.5 rounded font-bold border", 
                  state.fragility?.level === 'LOW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  state.fragility?.level === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  state.fragility?.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30'
                )}>
                  {state.fragility?.level || 'LOW'}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs text-slate-400 uppercase font-mono">Aggregated Fragility</span>
                    <span className={cn("text-xl font-bold font-mono", getFragilityColor(state.fragility?.score || 0))}>
                      {((state.fragility?.score || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (state.fragility?.score || 0) * 100))}%`,
                        background: `linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {(state.fragility?.components || []).slice(0, 3).map((comp) => (
                    <div key={comp.name} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">{comp.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", comp.value > 0.7 ? "bg-red-500" : comp.value > 0.4 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${comp.value * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-400 w-7 text-right">{(comp.value * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            
          </div>

          {/* Decision Pipeline Stepper */}
          <section className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
            <h2 className="font-semibold text-white text-xs uppercase tracking-wider mb-4">Autonomous Intelligence Pipeline</h2>
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between min-w-[650px]">
                {['OBSERVE', 'DISCOVER', 'COMPARE', 'STRESS', 'REFEREE', 'ALLOCATE'].map((stageName, idx, arr) => {
                  const stageData = state.pipeline?.stages?.find(s => s.stage === stageName);
                  const isDone = stageData?.status === 'COMPLETE';
                  const isCurrent = state.pipeline?.currentStage === stageName;
                  
                  return (
                    <React.Fragment key={stageName}>
                      <div className="flex flex-col items-center gap-1.5 relative z-10">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border transition-colors text-xs font-bold font-mono",
                          isDone ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                          isCurrent ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse" :
                          "bg-[#0a0e17] border-[#1e293b] text-slate-600"
                        )}>
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono font-bold tracking-wider",
                          isDone ? "text-emerald-400" : isCurrent ? "text-amber-400" : "text-slate-500"
                        )}>
                          {stageName}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="flex-1 h-0.5 bg-[#1e293b] -mt-5 mx-2 relative z-0">
                          {isDone && <div className="absolute top-0 left-0 h-full bg-emerald-500/50 w-full" />}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Live Journal Feed */}
        <div className="col-span-12 lg:col-span-4 bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col h-[650px]">
          <div className="border-b border-[#1e293b] bg-[#1a2332] px-4 py-3 flex justify-between items-center">
            <h2 className="font-semibold text-white text-sm">System Audit Journal</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">LIVE STREAM</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-[#1e293b]/50">
            {state.recentJournal && state.recentJournal.length > 0 ? (
              state.recentJournal.map((event) => (
                <div key={event.id} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>{formatTime(event.timestamp)}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">{event.type}</span>
                  </div>
                  <div className="font-medium text-slate-200 text-xs mb-0.5">{event.title}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{event.description}</div>
                  {event.policyVersion && (
                    <div className="text-[9px] font-mono text-cyan-400/80 mt-1">
                      Policy: {event.policyVersion}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs italic">
                Awaiting cycle events...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Scenario Controller - Fixed Bar */}
      <div className="fixed bottom-0 left-64 right-0 p-3 bg-[#0a0e17]/95 backdrop-blur-md border-t border-[#1e293b] flex items-center justify-between z-40 px-6">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Activity size={14} className="text-indigo-400" />
          <span>Macro Stress Simulation Scenarios:</span>
        </div>
        <div className="flex gap-2">
          {(['NORMAL', 'FRAGILITY_SPIKE', 'CASCADE', 'EXHAUSTION', 'RECOVERY'] as DemoScenario[]).map((scenario) => (
            <button
              key={scenario}
              onClick={() => {
                setIsLiveBinance(false);
                setScenario(scenario);
              }}
              className="px-3 py-1 text-xs font-mono font-semibold rounded border border-[#1e293b] bg-[#111827] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              {scenario.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapitalCard({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "bg-[#111827] border rounded-xl p-4 flex flex-col justify-between shadow-sm",
      highlight ? "border-amber-500/40 bg-amber-950/10" : "border-[#1e293b]"
    )}>
      <div className="text-[11px] text-slate-400 font-mono mb-1 uppercase tracking-wider">{title}</div>
      <div className={cn(
        "text-xl font-bold font-mono",
        highlight ? "text-amber-400" : "text-white"
      )}>
        {value}
      </div>
    </div>
  );
}
