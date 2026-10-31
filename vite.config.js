import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A fresh id per build. It is baked into the app and written to /version.json, so the app can tell when a newer version is live.
const BUILD_ID = String(Date.now());
const versionFile = () => ({
  name: 'version-file',
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) }); },
});

export default defineConfig({ plugins: [react(), versionFile()], define: { __BUILD_ID__: JSON.stringify(BUILD_ID) } });
