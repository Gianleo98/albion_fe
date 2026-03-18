/** Formatta la % di rendimento (profitto / costo * 100), es. +12,4% */
export function formatYieldPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function yieldPercentFromProfitAndCost(profit: number, cost: number): string {
  if (cost == null || cost <= 0) return '—';
  return formatYieldPercent((profit / cost) * 100);
}
