/**
 * Pesi e capacità trasporto (allineati a HomepageFlipMammothEstimator nel BE).
 * Pesi risorse base/raffinate da ao-bin-dumps (items.json); rune/soul/relic, artefatti, cape, BP, pesci da campioni sullo stesso dump.
 * Max load e % Porkpie da GET /api/crafting-settings.
 * Capacità effettiva = maxLoadKg × (1 + porkPieBonusPercent/100).
 */

import type { CraftingSettingsResponse } from '../types';

/** Default allineati al BE (nuove righe / valori assenti in risposta). */
export const DEFAULT_TRANSPORT_MAX_LOAD_KG = 3827;
export const DEFAULT_PORKPIE_BONUS_PERCENT = 30;

/** Config trasporto da crafting settings (max load + unica % Porkpie). */
export interface TransportLoadSettings {
  maxLoadKg: number;
  porkPieBonusPercent: number;
}

export function transportLoadFromCraftingSettings(s: CraftingSettingsResponse): TransportLoadSettings {
  const max = s.transportMaxLoadKg;
  const pie = s.porkPieBonusPercent;
  return {
    maxLoadKg: Math.max(1, max != null && Number.isFinite(max) ? max : DEFAULT_TRANSPORT_MAX_LOAD_KG),
    porkPieBonusPercent:
      pie != null && Number.isFinite(pie) ? pie : DEFAULT_PORKPIE_BONUS_PERCENT,
  };
}

function tierFromItemId(itemId: string): number {
  if (itemId.length >= 2 && itemId.charAt(0) === 'T') {
    const t = Number.parseInt(itemId.charAt(1), 10);
    return t >= 1 && t <= 8 ? t : 5;
  }
  return 5;
}

function standardGatherableWeightKg(tier: number): number {
  switch (tier) {
    case 1:
      return 0.15;
    case 2:
      return 0.23;
    case 3:
      return 0.34;
    case 4:
      return 0.51;
    case 5:
      return 0.76;
    case 6:
      return 1.14;
    case 7:
      return 1.71;
    case 8:
      return 2.56;
    default:
      return Math.max(0.15, 0.15 * Math.pow(1.5, Math.min(Math.max(tier - 1, 0), 7)));
  }
}

function soulWeightKg(tier: number): number {
  switch (tier) {
    case 4:
      return 0.05;
    case 5:
      return 0.25;
    case 6:
      return 0.38;
    case 7:
      return 0.5;
    case 8:
      return 1;
    default:
      return 0.05;
  }
}

function fishLikeWeightKg(tier: number): number {
  switch (tier) {
    case 1:
      return 0.05;
    case 2:
      return 0.1;
    case 3:
      return 0.2;
    case 4:
      return 0.21;
    case 5:
      return 0.31;
    case 6:
      return 0.41;
    case 7:
      return 0.52;
    case 8:
      return 0.73;
    default:
      return Math.max(0.05, 0.05 + tier * 0.09);
  }
}

function isStandardGatherableChain(core: string): boolean {
  return (
    core.includes('_PLANKS') ||
    core.includes('_METALBAR') ||
    core.includes('_STONEBLOCK') ||
    core.includes('_CLOTH') ||
    core.includes('_LEATHER') ||
    core.endsWith('_WOOD') ||
    core.endsWith('_ROCK') ||
    core.endsWith('_ORE') ||
    core.endsWith('_HIDE') ||
    core.endsWith('_COTTON') ||
    core.endsWith('_FIBER')
  );
}

/** Peso stimato per unità (kg), allineato al BE (dump di gioco). */
export function estimateItemWeightKg(itemId: string): number {
  if (itemId == null || itemId.trim() === '') {
    return 2.0;
  }
  const u = itemId.toUpperCase();
  const tier = tierFromItemId(itemId);
  const core = u.replace(/_LEVEL\d+@\d+$/i, '');
  if (u.includes('_BP')) {
    return 0.51;
  }
  if (u.endsWith('_RUNE') || u.endsWith('_SOUL') || u.endsWith('_RELIC')) {
    return soulWeightKg(tier);
  }
  if (isStandardGatherableChain(core)) {
    return standardGatherableWeightKg(tier);
  }
  if (u.includes('ARTEFACT')) {
    return 2.0;
  }
  if (u.includes('CAPEITEM')) {
    return (standardGatherableWeightKg(tier) * 10) / 3;
  }
  if (u.includes('FISH') || u.includes('SEAWEED') || u.includes('REMAINS') || u.includes('INGREDIENT')) {
    return fishLikeWeightKg(tier);
  }
  if (tier >= 1 && tier <= 8) {
    return standardGatherableWeightKg(tier);
  }
  return Math.max(0.5, 1.2 + tier * 0.18);
}

export function effectiveMaxLoadKg(settings: TransportLoadSettings): number {
  const base = Math.max(1, settings.maxLoadKg);
  const b = Number.isFinite(settings.porkPieBonusPercent) ? settings.porkPieBonusPercent : 0;
  return base * (1 + b / 100);
}

export interface RefiningTransportPlan {
  rawItemId: string;
  lowerItemId: string;
  rawQty: number;
  lowerQty: number;
  weightRawKg: number;
  weightLowerKg: number;
  weightPerBatchKg: number;
  effectiveMaxLoadKg: number;
  porkPieBonusPercentApplied: number;
  maxFullBatches: number;
  buyRawTotal: number;
  buyLowerTotal: number;
  estimatedTripProfitSilver: number;
}

export function computeRefiningTransportPlan(
  settings: TransportLoadSettings,
  rawItemId: string,
  lowerItemId: string,
  rawQty: number,
  lowerQty: number,
  batchProfitSilver: number,
): RefiningTransportPlan | null {
  if (rawQty <= 0 || lowerQty <= 0 || !rawItemId || !lowerItemId) {
    return null;
  }
  const wRaw = estimateItemWeightKg(rawItemId);
  const wLower = estimateItemWeightKg(lowerItemId);
  const weightPerBatchKg = rawQty * wRaw + lowerQty * wLower;
  if (weightPerBatchKg <= 0) {
    return null;
  }
  const cap = effectiveMaxLoadKg(settings);
  const maxFullBatches = Math.floor(cap / weightPerBatchKg);
  const profit = Number.isFinite(batchProfitSilver) && batchProfitSilver > 0 ? batchProfitSilver : 0;
  const pie = Number.isFinite(settings.porkPieBonusPercent) ? settings.porkPieBonusPercent : 0;
  return {
    rawItemId,
    lowerItemId,
    rawQty,
    lowerQty,
    weightRawKg: wRaw,
    weightLowerKg: wLower,
    weightPerBatchKg,
    effectiveMaxLoadKg: cap,
    porkPieBonusPercentApplied: pie,
    maxFullBatches,
    buyRawTotal: maxFullBatches * rawQty,
    buyLowerTotal: maxFullBatches * lowerQty,
    estimatedTripProfitSilver: Math.round(maxFullBatches * profit),
  };
}

export interface RoyalFlipMammothUserTrip {
  weightKg: number;
  unitsPerTrip: number;
  tripProfitSilver: number;
  effectiveMaxLoadKg: number;
  baseMaxLoadKg: number;
  porkPieBonusPercentApplied: number;
}

export function computeRoyalFlipMammothUserTrip(
  itemId: string,
  profitPerUnitSilver: number,
  settings: TransportLoadSettings,
): RoyalFlipMammothUserTrip | null {
  if (profitPerUnitSilver <= 0 || !Number.isFinite(profitPerUnitSilver)) {
    return null;
  }
  const w = estimateItemWeightKg(itemId);
  if (!(w > 0)) {
    return null;
  }
  const cap = effectiveMaxLoadKg(settings);
  const units = Math.floor(cap / w);
  const pie = Number.isFinite(settings.porkPieBonusPercent) ? settings.porkPieBonusPercent : 0;
  return {
    weightKg: w,
    unitsPerTrip: units,
    tripProfitSilver: Math.round(units * profitPerUnitSilver),
    effectiveMaxLoadKg: cap,
    baseMaxLoadKg: settings.maxLoadKg,
    porkPieBonusPercentApplied: pie,
  };
}
