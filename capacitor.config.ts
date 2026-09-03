import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fornect.admin',
  appName: 'Fornect Admin',

  // Angular build ne pise direktno u `dist`, nego u
  // `dist/<ime projekta>/browser`. To je folder u kojem je
  // index.html, pa Capacitor mora gledati u njega.
  webDir: 'dist/fornect-admin-web/browser'
};

export default config;
