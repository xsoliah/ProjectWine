import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.winecellar',
  appName: 'Weinkeller',
  webDir: 'dist/web/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
