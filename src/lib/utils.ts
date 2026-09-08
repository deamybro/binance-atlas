import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
}

export function getModeBadgeColor(mode: string): string {
  switch (mode) {
    case 'OPPORTUNITY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'DEFENSE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'HUNT': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'RECOVERY': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function getFragilityColor(score: number): string {
  if (score < 0.25) return 'text-emerald-400';
  if (score < 0.50) return 'text-amber-400';
  if (score < 0.75) return 'text-orange-400';
  return 'text-red-400';
}
