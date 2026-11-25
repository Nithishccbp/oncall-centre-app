import type { CapacitorConfig } from '@capacitor/cli';

// The Android app opens your live site inside a native shell, so /api calls (Gemini, Vobiz, Twilio, Vonage) work
// exactly as on the web and every Vercel deploy updates the app automatically.
const LIVE_URL = process.env.CAP_SERVER_URL || 'https://oncall-centre-app.vercel.app';

const config: CapacitorConfig = {
  appId: 'ai.onground.callcentre',
  appName: 'OG Calls',
  webDir: 'dist',
  server: { url: LIVE_URL, cleartext: false, androidScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#1b4d3e' },
};
export default config;
