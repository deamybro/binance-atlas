'use client';

import React, { useEffect, useState } from 'react';
import { RiskConfig, ExecutionMode } from '@/core/types';
import { Shield, Key, Cpu, CheckCircle2, AlertTriangle, Save, Globe } from 'lucide-react';
import { useAtlasState } from '@/hooks/useAtlasState';

export default function ConfigPage() {
  const { state, refresh } = useAtlasState();
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Binance API Credentials State
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('PAPER');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [useTestnet, setUseTestnet] = useState(false);
  const [credsSaving, setCredsSaving] = useState(false);
  const [credsMessage, setCredsMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    fetchConfig();
    if (state?.executionMode) {
      setExecutionMode(state.executionMode);
    }
  }, [state?.executionMode]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config/risk');
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config) return;
    const { name, value } = e.target;
    setConfig({
      ...config,
      [name]: parseFloat(value)
    });
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/config/risk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Risk configuration saved successfully.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error saving configuration.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsSaving(true);
    setCredsMessage(null);

    try {
      const res = await fetch('/api/atlas/execution-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionMode,
          apiKey,
          apiSecret,
          useTestnet,
        }),
      });

      if (res.ok) {
        setCredsMessage({ type: 'success', text: `Execution settings updated. Mode: ${executionMode}` });
        refresh();
      } else {
        const err = await res.json();
        setCredsMessage({ type: 'error', text: err.error || 'Failed to update credentials' });
      }
    } catch (err: any) {
      setCredsMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setCredsSaving(false);
      setTimeout(() => setCredsMessage(null), 3500);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 font-mono text-sm">
        LOADING CONFIGURATION...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" />
          System Configuration & Execution Layer
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage Deterministic Risk Referee boundaries, Binance API authentication, and execution modes.
        </p>
      </div>

      {/* Execution Engine Settings Card */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Binance API & Execution Router</h2>
              <p className="text-xs text-slate-400">Connect live Binance API keys for real trading, or toggle paper sandbox mode.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
            executionMode === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            ROUTER: {executionMode}
          </span>
        </div>

        {credsMessage && (
          <div className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 border ${
            credsMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {credsMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {credsMessage.text}
          </div>
        )}

        <form onSubmit={saveCredentials} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Execution Mode</label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="PAPER">PAPER (Simulation sandbox with fee & slippage modeling)</option>
                <option value="LIVE">LIVE (Direct signed Binance order execution)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Network</label>
              <select
                value={useTestnet ? 'true' : 'false'}
                onChange={(e) => setUseTestnet(e.target.value === 'true')}
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="false">Binance Mainnet (api.binance.com)</option>
                <option value="true">Binance Testnet (testnet.binance.vision)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Binance API Key (Optional)</label>
              <input
                type="password"
                placeholder="Enter Binance API key or configure in .env.local"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Binance API Secret (Optional)</label>
              <input
                type="password"
                placeholder="Enter Binance API secret"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-[11px] text-slate-500">
              * Credentials can also be configured securely in <code className="text-slate-400">.env.local</code> as <code className="text-slate-400">BINANCE_API_KEY</code> and <code className="text-slate-400">BINANCE_API_SECRET</code>.
            </p>
            <button
              type="submit"
              disabled={credsSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
            >
              <Save size={14} />
              {credsSaving ? 'Updating...' : 'Update Execution Router'}
            </button>
          </div>
        </form>
      </div>

      {/* Risk Referee Rules Form */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Deterministic Risk Referee Rules</h2>
              <p className="text-xs text-slate-400">AI agents are strictly bound to these human-defined mathematical limits.</p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            HUMAN-ONLY RECONFIG
          </span>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 border ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        <form onSubmit={saveConfig} className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Leverage (x)</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="1"
                  max="20"
                  name="maxLeverage" 
                  value={config.maxLeverage} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Asset Concentration (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  name="maxAssetConcentration" 
                  value={config.maxAssetConcentration} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Total Portfolio Exposure (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  name="maxTotalExposure" 
                  value={config.maxTotalExposure} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Fragility Limit (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  name="maxFragilityScore" 
                  value={config.maxFragilityScore} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Trade Loss ($)</label>
                <input 
                  type="number" 
                  step="100"
                  name="maxTradeLoss" 
                  value={config.maxTradeLoss} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Daily Loss Limit ($)</label>
                <input 
                  type="number" 
                  step="500"
                  name="dailyLossLimit" 
                  value={config.dailyLossLimit} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Max Slippage Threshold (0.0 - 0.1)</label>
                <input 
                  type="number" 
                  step="0.005"
                  min="0"
                  max="0.1"
                  name="maxSlippage" 
                  value={config.maxSlippage} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Min Free Available Capital (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  name="minAvailableCapital" 
                  value={config.minAvailableCapital} 
                  onChange={handleChange}
                  className="w-full bg-[#0a0e17] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-[#1e293b]">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              <Save size={16} />
              {saving ? 'Saving Rules...' : 'Save Risk Rules'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
