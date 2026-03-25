import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { syncAlbionDailyReminder } from '../services/albionNotifications';
import { refreshFlipHighProfitAlerts } from '../services/flipHighProfitNotify';

/**
 * Su dispositivo nativo: promemoria giornaliero alle 10:00 (se permesso) + alert Flip ad alto profitto.
 * Il digest è aggiornato subito; i Flip hanno delay/throttle in `refreshFlipHighProfitAlerts`.
 */
export function NativeFlipAlerts() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void syncAlbionDailyReminder();

    const coldStartTimer = window.setTimeout(() => {
      void refreshFlipHighProfitAlerts();
    }, 3500);

    let resumeHandle: { remove: () => Promise<void> } | undefined;
    void import('@capacitor/app').then(async ({ App }) => {
      resumeHandle = await App.addListener('resume', () => {
        void syncAlbionDailyReminder();
        void refreshFlipHighProfitAlerts();
      });
    });

    return () => {
      clearTimeout(coldStartTimer);
      void resumeHandle?.remove();
    };
  }, []);

  return null;
}
