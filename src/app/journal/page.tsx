'use client';

import React, { useEffect, useState } from 'react';
import { JournalEvent } from '@/core/types';
import { formatTime } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Download, RefreshCw, Hash, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface VerificationState {
  valid: boolean;
  eventCount: number;
  brokenIndex?: number;
  error?: string;
}

export default function JournalPage() {
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/atlas/journal?limit=150');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      } else if (data.events) {
        setEvents(data.events);
      }

      // Also fetch verification status
      const vRes = await fetch('/api/atlas/journal?verify=true');
      const vData = await vRes.json();
      setVerification(vData);
    } catch (error) {
      console.error('Error fetching journal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await fetch('/api/atlas/journal?verify=true');
      const data = await res.json();
      setVerification(data);
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleExportChain = async () => {
    try {
      const res = await fetch('/api/atlas/journal?export=true');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atlas-audit-chain-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'FAIL_CLOSED':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'OPERATOR_CONFIRMED':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      case 'RECONCILIATION':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
      case 'REFEREE_DECISION':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'EXECUTION':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'PROPOSAL_CREATED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MODE_CHANGE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="p-6 text-slate-200 min-h-screen bg-[#0a0e17] space-y-6">
      {/* Header & Cryptographic Audit Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Hash-Linked System Journal</h1>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono">
              SHA-256 CAPITAL MEMORY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident append-only ledger with cryptographic hash linking and policy-as-code traceability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Verification Status Pill */}
          {verification && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
              verification.valid 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {verification.valid ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              <span>
                {verification.valid 
                  ? `CHAIN INTEGRITY VERIFIED (${verification.eventCount} BLOCKS)` 
                  : `CHAIN BROKEN AT BLOCK ${verification.brokenIndex}`}
              </span>
            </div>
          )}

          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] hover:bg-[#1a2332] text-slate-300 border border-[#1e293b] rounded-lg text-xs font-mono transition-colors"
          >
            <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
            Verify Chain
          </button>

          <button
            onClick={handleExportChain}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-medium transition-colors"
          >
            <Download size={14} />
            Export Audit JSON
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 font-mono text-sm py-12 text-center">Loading cryptographic audit trail...</div>
      ) : events.length === 0 ? (
        <div className="text-slate-400 p-8 border border-slate-800 bg-[#111827] rounded-lg text-center font-mono">
          No audit entries recorded yet. Step a cycle to initiate the hash chain.
        </div>
      ) : (
        <div className="relative border-l-2 border-emerald-500/30 ml-4 pl-6 space-y-6 py-2">
          {events.map((event, idx) => (
            <div key={event.id || idx} className="relative group">
              {/* Chain Node Marker */}
              <div className="absolute -left-[33px] top-3 w-4 h-4 rounded-full border-2 border-[#0a0e17] bg-emerald-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>

              <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 shadow-sm hover:border-slate-500 transition-all">
                {/* Event Header */}
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {formatTime(event.timestamp)}
                    </span>
                    <h3 className="font-semibold text-white text-sm">{event.title}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {event.policyVersion && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        POLICY: {event.policyVersion}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded border ${getEventBadge(event.type)}`}>
                      {event.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{event.description}</p>

                {/* Cryptographic Hash Chain Badges */}
                <div className="mt-4 pt-3 border-t border-[#1e293b] grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400 bg-[#0a0e17] px-2.5 py-1.5 rounded border border-[#1e293b]">
                    <Hash size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-slate-500">Hash:</span>
                    <span className="text-slate-200 truncate" title={event.hash}>
                      {event.hash || 'GENESIS'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 bg-[#0a0e17] px-2.5 py-1.5 rounded border border-[#1e293b]">
                    <Lock size={13} className="text-cyan-400 shrink-0" />
                    <span className="text-slate-500">Prev Hash:</span>
                    <span className="text-slate-200 truncate" title={event.previousHash}>
                      {event.previousHash?.startsWith('00000000') ? 'GENESIS BLOCK' : event.previousHash || 'GENESIS'}
                    </span>
                  </div>
                </div>

                {/* Metadata details if present */}
                {event.data && Object.keys(event.data).length > 0 && (
                  <div className="mt-3 bg-[#0a0e17] rounded-lg p-2.5 border border-[#1e293b]/70">
                    <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Telemetry & Payload Parameters:</div>
                    <pre className="text-[11px] font-mono text-slate-400 overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
