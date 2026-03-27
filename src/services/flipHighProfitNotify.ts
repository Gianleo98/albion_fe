import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type Schedule } from '@capacitor/local-notifications';
import type { FlipProfitResponse } from '../types';
import { getFlipProfits } from './api';
import { getNotificationPermissionStatus } from './albionNotifications';

/** Soglia profitto Flip (Caerleon → BM) per l'avviso su dispositivo nativo */
export const FLIP_PROFIT_ALERT_THRESHOLD = 100_000;

const STORAGE_KEY = 'albion_flip_alert_cooldown_v1';
/** Non ripetere la stessa notifica per lo stesso item entro questa finestra */
const COOLDOWN_PER_ITEM_MS = 4 * 60 * 60 * 1000;
/** Evita raffiche di richieste API quando cambi tab / refresh */
const MIN_REFRESH_INTERVAL_MS = 45_000;

const CHANNEL_ID = 'flip-high-profit';
const FLIP_DIGEST_NOTIFICATION_ID = 9_000_002;

let refreshInFlight = false;
let lastRefreshStartedAt = 0;

function loadCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, number>;
    return typeof o === 'object' && o !== null ? o : {};
  } catch {
    return {};
  }
}

function saveCooldowns(map: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function shortFlipLabel(itemId: string): string {
  let name = itemId;
  if (name.length > 3 && /^T\d/.test(name)) name = name.replace(/^T\d_/, '');
  const at = name.indexOf('@');
  if (at >= 0) name = `${name.slice(0, at)} .${name.slice(at + 1)}`;
  const levelIdx = name.indexOf('_LEVEL');
  if (levelIdx >= 0) name = name.substring(0, levelIdx);
  name = name.replace(/^2H_/, '').replace(/^MAIN_/, '').replace(/^OFF_/, '');
  return name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

/** Id notifica Android: intero 32 bit stabile per item */
function notificationIdForItem(itemId: string): number {
  let h = 0;
  for (let i = 0; i < itemId.length; i++) {
    h = (Math.imul(31, h) + itemId.charCodeAt(i)) | 0;
  }
  const positive = h === -2147483648 ? 0 : Math.abs(h);
  return positive % 2_100_000_000;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Flip — opportunità',
      description: 'Avvisi quando un item Flip supera la soglia di profitto',
      importance: 4,
      vibration: true,
    });
  } catch {
    /* canale già presente o non supportato */
  }
}

async function notifyFlipHighProfitsIfNeeded(items: FlipProfitResponse[]): Promise<void> {
  const high = items.filter((i) => i.profit > FLIP_PROFIT_ALERT_THRESHOLD);
  if (high.length === 0) return;

  if ((await getNotificationPermissionStatus()) !== 'granted') {
    return;
  }

  await ensureAndroidChannel();

  const now = Date.now();
  const cd = loadCooldowns();
  const digestLines: string[] = [];
  for (const item of high) {
    const last = cd[item.itemId] ?? 0;
    if (now - last < COOLDOWN_PER_ITEM_MS) continue;
    cd[item.itemId] = now;
    const profitStr = item.profit.toLocaleString('it-IT');
    digestLines.push(`${shortFlipLabel(item.itemId)} +${profitStr}`);
  }

  if (digestLines.length === 0) return;
  saveCooldowns(cd);

  const body =
    digestLines.length > 4
      ? `${digestLines.slice(0, 4).join('\n')}\n+${digestLines.length - 4} altre opportunita`
      : digestLines.join('\n');

  await LocalNotifications.schedule({
    notifications: [
      {
        id: FLIP_DIGEST_NOTIFICATION_ID,
        title: ' ',
        body,
        schedule: { at: new Date(now + 600), allowWhileIdle: true } as Schedule,
        channelId: Capacitor.getPlatform() === 'android' ? CHANNEL_ID : undefined,
        smallIcon: 'ic_launcher',
        largeIcon: 'ic_launcher',
      },
    ],
  });
}

/**
 * Chiede i migliori flip per profitto e, su Android/iOS, mostra notifiche locali sopra soglia.
 * No-op sul web. Throttling anti-raffica incluso.
 */
export async function refreshFlipHighProfitAlerts(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (refreshInFlight) return;
  const t = Date.now();
  if (t - lastRefreshStartedAt < MIN_REFRESH_INTERVAL_MS) return;
  lastRefreshStartedAt = t;
  refreshInFlight = true;
  try {
    const { content } = await getFlipProfits(0, 40, 'PROFIT', 'DESC');
    await notifyFlipHighProfitsIfNeeded(content);
  } catch {
    /* rete / token: silenzioso */
  } finally {
    refreshInFlight = false;
  }
}
