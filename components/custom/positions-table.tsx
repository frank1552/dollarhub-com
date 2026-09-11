'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Localize } from '@deriv-com/translations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSymbolDisplayName } from '@/lib/active-symbols-display-names';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { OpenPositionCard } from './open-position-card';
import { ClosedPositionCard } from './closed-position-card';
import type { OpenPosition } from '@/hooks/use-open-positions';
import type { ClosedPosition } from '@/hooks/use-closed-positions';

export type PositionFilter = 'open' | 'closed' | 'all';

interface PositionsTableProps {
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  onSell: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  onClearSellError: () => void;
  /** Map from contract_type string to display label. Falls back to raw type. */
  contractTypeLabels?: Record<string, string>;
  /** Merged onto the root wrapper (spacing, max-height, overflow). */
  className?: string;
}

function getValueColHeader(
  filter: PositionFilter,
  localize: (text: string, values?: Record<string, unknown>) => string
): string {
  switch (filter) {
    case 'open':
      return localize('Current Value');
    case 'closed':
      return localize('Sell Price');
    case 'all':
      return localize('Value');
  }
}

function formatContractType(
  contractType: string,
  labels: Record<string, string>,
  barrier?: string
): string {
  const label = labels[contractType] ?? contractType;
  return barrier !== undefined ? `${label} (${barrier})` : label;
}

export function PositionsTable({
  openPositions,
  closedPositions,
  onSell,
  sellingId,
  sellError,
  onClearSellError,
  contractTypeLabels = {},
  className,
}: PositionsTableProps) {
  const { localize } = useAppTranslations();
  const [filter, setFilter] = useState<PositionFilter>('open');

  useEffect(() => {
    if (sellError) {
      toast.error(localize('Sell Failed'), { description: sellError });
      onClearSellError();
    }
  }, [sellError, onClearSellError, localize]);

  const totalCount = openPositions.length + closedPositions.length;

  const visibleOpen = filter === 'open' || filter === 'all' ? openPositions : [];
  const visibleClosed = filter === 'closed' || filter === 'all' ? closedPositions : [];
  const openProfit = openPositions.reduce((total, position) => total + (parseFloat(position.profit) || 0), 0);
  const closedProfit = closedPositions.reduce((total, position) => total + position.sell_price - position.buy_price, 0);
  const totalProfit = openProfit + closedProfit;

  const filterOptions: { value: PositionFilter; label: string; count: number }[] = [
    { value: 'open', label: localize('Running'), count: openPositions.length },
    { value: 'closed', label: localize('Closed'), count: closedPositions.length },
    { value: 'all', label: localize('All'), count: totalCount },
  ];

  return (
    <div className={cn('mt-6', className)}>
      {/* Header and position-state tabs */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
          <Localize i18n_default_text="Report" />
          </h2>
          <p className="text-xs text-muted-foreground">{localize('Track running and completed contracts')}</p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:w-auto">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? 'default' : 'ghost'}
              className="h-9 gap-1.5 px-3 text-xs"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', filter === option.value ? 'bg-primary-foreground/20' : 'bg-background')}>
                {option.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <SummaryMetric label={localize('Running P/L')} value={openProfit} tone="live" />
        <SummaryMetric label={localize('Closed P/L')} value={closedProfit} />
        <SummaryMetric label={localize('Total P/L')} value={totalProfit} />
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Localize i18n_default_text="Type" />
              </TableHead>
              <TableHead>
                <Localize i18n_default_text="Symbol" />
              </TableHead>
              <TableHead className="text-right">
                <Localize i18n_default_text="Stake" />
              </TableHead>
              <TableHead className="text-right">{getValueColHeader(filter, localize)}</TableHead>
              <TableHead className="text-right">
                <Localize i18n_default_text="P&L" />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleOpen.map((pos) => (
              <OpenPositionRow
                key={`open-${pos.contract_id}`}
                pos={pos}
                isSelling={sellingId === pos.contract_id}
                onSell={onSell}
                contractTypeLabels={contractTypeLabels}
              />
            ))}
            {visibleClosed.map((pos) => (
              <ClosedPositionRow
                key={`closed-${pos.contract_id}`}
                pos={pos}
                contractTypeLabels={contractTypeLabels}
              />
            ))}
            {visibleOpen.length === 0 && visibleClosed.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  <Localize i18n_default_text="No positions" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: cards */}
      <div className="lg:hidden flex flex-col gap-3">
        {visibleOpen.map((pos) => (
          <OpenPositionCard
            key={`open-card-${pos.contract_id}`}
            pos={pos}
            isSelling={sellingId === pos.contract_id}
            onSell={onSell}
            contractTypeLabels={contractTypeLabels}
          />
        ))}
        {visibleClosed.map((pos) => (
          <ClosedPositionCard
            key={`closed-card-${pos.contract_id}`}
            pos={pos}
            contractTypeLabels={contractTypeLabels}
          />
        ))}
        {visibleOpen.length === 0 && visibleClosed.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            <Localize i18n_default_text="No positions" />
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone?: 'live' }) {
  const positive = value >= 0;
  return (
    <div className={cn('rounded-lg border border-border bg-card px-3 py-2', tone === 'live' && 'border-emerald-500/30')}>
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-sm font-bold', positive ? 'text-emerald-600' : 'text-destructive')}>
        {positive ? '+' : ''}{value.toFixed(2)}
      </p>
    </div>
  );
}

// ─── Desktop table rows ────────────────────────────────────────────────────

function OpenPositionRow({
  pos,
  isSelling,
  onSell,
  contractTypeLabels,
}: {
  pos: OpenPosition;
  isSelling: boolean;
  onSell: (contractId: number, bidPrice: string) => Promise<void>;
  contractTypeLabels: Record<string, string>;
}) {
  const { localize } = useAppTranslations();
  const profit = parseFloat(pos.profit);
  const isProfit = profit >= 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatContractType(pos.contract_type, contractTypeLabels, pos.barrier)}
      </TableCell>
      <TableCell className="text-muted-foreground">{getSymbolDisplayName(pos.underlying_symbol)}</TableCell>
      <TableCell className="text-right">
        {parseFloat(pos.buy_price).toFixed(2)} {pos.currency}
      </TableCell>
      <TableCell className="text-right">
        {parseFloat(pos.bid_price).toFixed(2)} {pos.currency}
      </TableCell>
      <ProfitCell profit={profit} profitPct={pos.profit_percentage} currency={pos.currency} isProfit={isProfit} />
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          disabled={isSelling || pos.is_valid_to_sell !== 1}
          onClick={() => onSell(pos.contract_id, pos.bid_price)}
        >
          {isSelling ? localize('Selling...') : localize('Sell')}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ClosedPositionRow({
  pos,
  contractTypeLabels,
}: {
  pos: ClosedPosition;
  contractTypeLabels: Record<string, string>;
}) {
  const profit = pos.sell_price - pos.buy_price;
  const profitPct = (profit / pos.buy_price) * 100;
  const isProfit = profit >= 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatContractType(pos.contract_type, contractTypeLabels)}
      </TableCell>
      <TableCell className="text-muted-foreground">{getSymbolDisplayName(pos.underlying_symbol)}</TableCell>
      <TableCell className="text-right">
        {pos.buy_price.toFixed(2)}
      </TableCell>
      <TableCell className="text-right">
        {pos.sell_price.toFixed(2)}
      </TableCell>
      <ProfitCell profit={profit} profitPct={profitPct} currency="" isProfit={isProfit} />
      <TableCell />
    </TableRow>
  );
}

function ProfitCell({
  profit,
  profitPct,
  currency,
  isProfit,
}: {
  profit: number;
  profitPct: number;
  currency: string;
  isProfit: boolean;
}) {
  return (
    <TableCell
      className={cn(
        'text-right font-semibold',
        isProfit ? 'text-green-600' : 'text-destructive'
      )}
    >
      {isProfit ? '+' : ''}{profit.toFixed(2)}{currency ? ` ${currency}` : ''}
      <span className="text-xs font-normal ml-1 opacity-70">
        ({isProfit ? '+' : ''}{profitPct.toFixed(1)}%)
      </span>
    </TableCell>
  );
}
