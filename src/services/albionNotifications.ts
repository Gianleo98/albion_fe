import { Capacitor } from '@capacitor/core';

/** Ora locale del promemoria giornaliero (app in background / chiusa). */
export const DAILY_REMINDER_HOUR = 10;
export const DAILY_REMINDER_MINUTE = 0;

const CHANNEL_DAILY_ID = 'albus-daily';

/** Id fisso: non deve collidere con gli id hash degli alert Flip (vedi flipHighProfitNotify). */
const DAILY_DIGEST_NOTIFICATION_ID = 9_000_001;

export type NotificationPermissionDisplay = 'granted' | 'denied' | 'prompt';

export async function isNativeNotificationsAvailable(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionDisplay> {
  if (!Capacitor.isNativePlatform()) {
    return 'denied';
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const p = await LocalNotifications.checkPermissions();
  if (p.display === 'granted') return 'granted';
  if (p.display === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const r = await LocalNotifications.requestPermissions();
  return r.display === 'granted';
}

async function ensureDailyChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_DAILY_ID,
      name: 'Albus — promemoria',
      description: 'Promemoria giornaliero e riepilogo app',
      importance: 4,
      vibration: true,
    });
  } catch {
    /* già presente o non supportato */
  }
}

/**
 * Un promemoria ogni giorno alle {@link DAILY_REMINDER_HOUR}:00 (fuso locale).
 * Non richiede il permesso: se non concesso, esce subito.
 */
export async function syncAlbionDailyReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if ((await getNotificationPermissionStatus()) !== 'granted') return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await ensureDailyChannel();

  await LocalNotifications.cancel({ notifications: [{ id: DAILY_DIGEST_NOTIFICATION_ID }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_DIGEST_NOTIFICATION_ID,
        title: 'Albus — promemoria',
        body: 'Controlla opportunità Flip, Focus e prezzi materiali su Lymhurst.',
        channelId: Capacitor.getPlatform() === 'android' ? CHANNEL_DAILY_ID : undefined,
        schedule: {
          on: { hour: DAILY_REMINDER_HOUR, minute: DAILY_REMINDER_MINUTE },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ],
  });
}
