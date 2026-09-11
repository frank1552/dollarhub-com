'use client';

import { Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProposalInfo } from '@deriv/core';
import type { ContractMode, DigitStats, TradeType } from '@/lib/types';

interface RiskLensProps {
  activeSymbol: string;
  digitStats: DigitStats;
  selectedDigit: number;
  tradeType: TradeType;
  contractMode: ContractMode;
  stake: string;
  balance?: string;
  proposal: ProposalInfo | null;
}

function getProbability(stats: DigitStats, mode: ContractMode, digit: number): number {
  if (mode === 'DIGITMATCH') return stats.percentages[digit] ?? 0;
  if (mode === 'DIGITDIFF') return 100 - (stats.percentages[digit] ?? 0);
  if (mode === 'DIGITOVER') return stats.percentages.slice(digit + 1).reduce((sum, value) => sum + value, 0);
  if (mode === 'DIGITUNDER') return stats.percentages.slice(0, digit).reduce((sum, value) => sum + value, 0);
  const parity = mode === 'DIGITEVEN' ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9];
  return parity.reduce((sum, value) => sum + (stats.percentages[value] ?? 0), 0);
}

function getFairProbability(mode: ContractMode, digit: number): number {
  if (mode === 'DIGITMATCH') return 10;
  if (mode === 'DIGITDIFF') return 90;
  if (mode === 'DIGITOVER') return (9 - digit) * 10;
  if (mode === 'DIGITUNDER') return digit * 10;
  return 50;
}

function getContractLabel(mode: ContractMode, digit: number): string {
  if (mode === 'DIGITMATCH') return `Matches ${digit}`;
  if (mode === 'DIGITDIFF') return `Differs from ${digit}`;
  if (mode === 'DIGITOVER') return `Over ${digit}`;
  if (mode === 'DIGITUNDER') return `Under ${digit}`;
  return mode === 'DIGITEVEN' ? 'Even' : 'Odd';
}

export function RiskLens({
  activeSymbol,
  digitStats,
  selectedDigit,
  contractMode,
  stake,
  balance,
  proposal,
}: RiskLensProps) {
  const observed = getProbability(digitStats, contractMode, selectedDigit);
  const fair = getFairProbability(contractMode, selectedDigit);
  const edge = observed - fair;
  const stakeValue = Number(stake) || 0;
  const balanceValue = Number(balance) || 0;
  const exposure = balanceValue > 0 ? (stakeValue / balanceValue) * 100 : null;
  const enoughData = digitStats.totalTicks >= 50;
  const confidence = Math.min(99, Math.max(1, 45 + Math.abs(edge) * 2.2 + Math.min(digitStats.totalTicks, 200) / 20));
  const action = !enoughData
    ? 'Wait for more ticks'
    : exposure !== null && exposure > 5
      ? 'Reduce stake'
      : edge <= 0
        ? 'No clear edge'
        : 'Review before trading';
  const actionTone = action === 'Review before trading' ? 'text-amber-600' : 'text-rose-600';

  return (
    <Card className="risk-lens overflow-hidden border-white/10 bg-slate-950/80 text-white shadow-2xl backdrop-blur-xl">
      <CardHeader className="border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            AI Risk Lens
          </CardTitle>
          <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-200">
            {activeSymbol}
          </span>
        </div>
        <p className="text-xs text-slate-400">Live frequency analysis, not a guarantee of outcome.</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Observed chance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{observed.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-slate-400">{getContractLabel(contractMode, selectedDigit)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Fair baseline</p>
            <p className="mt-1 text-xl font-medium text-slate-200">{fair.toFixed(1)}%</p>
            <p className={`mt-1 text-xs font-medium ${edge > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {edge >= 0 ? '+' : ''}{edge.toFixed(1)} pts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-white/5 p-3"><p className="text-slate-400">Ticks</p><p className="mt-1 font-semibold">{digitStats.totalTicks}</p></div>
          <div className="rounded-lg bg-white/5 p-3"><p className="text-slate-400">Confidence</p><p className="mt-1 font-semibold">{confidence.toFixed(0)}%</p></div>
          <div className="rounded-lg bg-white/5 p-3"><p className="text-slate-400">Exposure</p><p className="mt-1 font-semibold">{exposure === null ? '—' : `${exposure.toFixed(1)}%`}</p></div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
          {action === 'Review before trading' ? <Activity className="mt-0.5 h-4 w-4 text-amber-300" /> : <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-300" />}
          <div>
            <p className={`text-sm font-semibold ${actionTone}`}>{action}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {proposal ? `Current quote: ${proposal.askPrice.toFixed(2)} USD. Keep each stake small and set a session limit.` : 'Waiting for a live proposal before comparing the quote.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}