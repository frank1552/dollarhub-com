'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DerivWS } from '../ws';
import type { ActiveSymbol, ContractsForResponse, ContractInfo, DurationLimits } from '../types';
import { pickDefaultSymbol } from '../utils/pick-default-symbol';

const SYMBOL_PARAM = 'symbol';
const METADATA_CACHE_TTL_MS = 60_000;

interface MetadataCacheEntry<T> {
  value: T;
  cachedAt: number;
}

const activeSymbolsCache = new Map<string, MetadataCacheEntry<ActiveSymbol[]>>();
const contractsCache = new Map<string, MetadataCacheEntry<ContractInfo[]>>();

function getFreshCache<T>(cache: Map<string, MetadataCacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.cachedAt > METADATA_CACHE_TTL_MS) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.value;
}

function readSymbolFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get(SYMBOL_PARAM) ?? undefined;
}

function writeSymbolToUrl(symbol: string): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set(SYMBOL_PARAM, symbol);
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

interface UseActiveSymbolsReturn {
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  contracts: ContractInfo[];
  contractsAvailable: boolean;
  durationLimits: DurationLimits;
  defaultStake: number;
  isLoading: boolean;
}

export function useActiveSymbols(
  ws: DerivWS | null,
  isConnected: boolean,
  contractTypes: string[]
): UseActiveSymbolsReturn {
  const contractTypesKey = contractTypes.slice().sort().join('|');
  const [symbols, setSymbols] = useState<ActiveSymbol[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<ActiveSymbol | null>(null);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [contractsAvailable, setContractsAvailable] = useState(false);
  const [durationLimits, setDurationLimits] = useState<DurationLimits>({ min: 1, max: 10, unit: 't' });
  const [defaultStake, setDefaultStake] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(true);

  const loadContractsFor = useCallback(async (wsInstance: DerivWS, symbol: ActiveSymbol) => {
    const cacheKey = `${symbol.underlying_symbol}:${contractTypesKey}`;
    const cached = getFreshCache(contractsCache, cacheKey);
    if (cached) {
      setContracts(cached);
      setContractsAvailable(cached.length > 0);
      if (cached.length > 0) {
        const contract = cached[0];
        const minMatch = contract.min_contract_duration.match(/^(\d+)/);
        const maxMatch = contract.max_contract_duration.match(/^(\d+)/);
        const unit = contract.min_contract_duration.replace(/^\d+/, '');
        setDurationLimits({
          min: minMatch ? parseInt(minMatch[1], 10) : 1,
          max: maxMatch ? parseInt(maxMatch[1], 10) : 10,
          unit,
        });
        setDefaultStake(contract.default_stake);
      }
      return;
    }

    const response = await wsInstance.send<ContractsForResponse>({
      contracts_for: symbol.underlying_symbol,
    });

    const filtered = response.contracts_for?.available?.filter(
      (c) => contractTypes.includes(c.contract_type)
    ) ?? [];
    contractsCache.set(cacheKey, { value: filtered, cachedAt: Date.now() });
    setContracts(filtered);
    setContractsAvailable(filtered.length > 0);

    if (filtered.length > 0) {
      const contract = filtered[0];
      const minMatch = contract.min_contract_duration.match(/^(\d+)/);
      const maxMatch = contract.max_contract_duration.match(/^(\d+)/);
      const unit = contract.min_contract_duration.replace(/^\d+/, '');
      const min = minMatch ? parseInt(minMatch[1], 10) : 1;
      const max = maxMatch ? parseInt(maxMatch[1], 10) : 10;
      setDurationLimits({ min, max, unit });
      setDefaultStake(contract.default_stake);
    }
  }, [contractTypes, contractTypesKey]);

  const selectSymbol = useCallback((underlyingSymbol: string) => {
    if (!ws || !isConnected) return;

    const symbol = symbols.find((s) => s.underlying_symbol === underlyingSymbol);
    if (!symbol || symbol.underlying_symbol === activeSymbol?.underlying_symbol) return;

    setActiveSymbol(symbol);
    writeSymbolToUrl(symbol.underlying_symbol);
    loadContractsFor(ws, symbol).catch(() => {});
  }, [ws, isConnected, symbols, activeSymbol, loadContractsFor]);

  useEffect(() => {
    if (!ws || !isConnected) return;
    let disposed = false;

    async function fetchSymbols() {
      try {
        setIsLoading(true);
        const cachedSymbols = getFreshCache(activeSymbolsCache, contractTypesKey);
        const allSymbols = cachedSymbols ?? (await ws!.send<{ active_symbols: ActiveSymbol[] }>({
          active_symbols: 'full',
          contract_type: contractTypes,
        })).active_symbols;
        if (disposed) return;

        if (!allSymbols || allSymbols.length === 0) {
          throw new Error('No symbols available');
        }

        if (!cachedSymbols) {
          activeSymbolsCache.set(contractTypesKey, { value: allSymbols, cachedAt: Date.now() });
        }

        setSymbols(allSymbols);
        const chosen = pickDefaultSymbol(allSymbols, readSymbolFromUrl());
        setActiveSymbol(chosen);
        writeSymbolToUrl(chosen.underlying_symbol);

        await loadContractsFor(ws!, chosen);
        if (disposed) return;

        setIsLoading(false);
      } catch {
        if (!disposed) setIsLoading(false);
      }
    }

    fetchSymbols();
    return () => { disposed = true; };
  }, [ws, isConnected, contractTypes, contractTypesKey, loadContractsFor]);

  return {
    symbols,
    activeSymbol,
    selectSymbol,
    contracts,
    contractsAvailable,
    durationLimits,
    defaultStake,
    isLoading,
  };
}
