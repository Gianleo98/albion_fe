import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.janraion.albion',
  appName: 'Albus',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#4f7cff',
    },
  },
};

export default config;
