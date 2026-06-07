/** Enchant da itemId gear (T8_ITEM@2) o 0 se assente. */
export function parseEnchantmentFromItemId(itemId: string): number {
  const at = itemId.lastIndexOf('@');
  if (at < 0 || at >= itemId.length - 1) return 0;
  const n = Number.parseInt(itemId.slice(at + 1), 10);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 0;
}

/** Nome leggibile senza tier né suffisso enchant (@ / _LEVEL). */
export function formatItemBaseName(itemId: string): string {
  let name = itemId;
  if (name.length > 3 && /^T\d_/.test(name)) name = name.substring(3);
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  const atIdx = name.indexOf('@');
  if (atIdx >= 0) name = name.substring(0, atIdx);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

/** Etichetta UI: «Longbow .2» — mai @2 nel testo. */
export function formatItemLabel(itemId: string, enchantment?: number | null): string {
  const base = formatItemBaseName(itemId);
  const ench = enchantment ?? parseEnchantmentFromItemId(itemId);
  return ench > 0 ? `${base} .${ench}` : base;
}
