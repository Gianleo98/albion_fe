import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { refreshFlipHighProfitAlerts } from '../services/flipHighProfitNotify';

/**
 * Su dispositivo nativo: controllo Flip all’avvio e quando l’app torna in primo piano.
 */
export function NativeFlipAlerts() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const coldStartTimer = window.setTimeout(() => {
      void refreshFlipHighProfitAlerts();
    }, 3500);

    let resumeHandle: { remove: () => Promise<void> } | undefined;
    void import('@capacitor/app').then(async ({ App }) => {
      resumeHandle = await App.addListener('resume', () => {
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
