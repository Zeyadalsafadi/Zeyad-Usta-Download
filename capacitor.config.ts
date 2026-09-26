import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeyadusta.app',
  appName: 'Zeyad Usta',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false }
};

export default config;
