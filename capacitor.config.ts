import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flechatrampa.game',
  appName: 'FLECHA TRAMPA',
  webDir: 'dist',
  backgroundColor: '#101218',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#101218' },
  ios: { contentInset: 'never', backgroundColor: '#101218' },
};

export default config;
