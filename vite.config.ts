import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function offlineAssetManifest(): Plugin {
  return {
    name: 'offline-asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((fileName) => fileName !== 'offline-assets.json' && fileName !== 'sw.js')
        .map((fileName) => `/${fileName}`)
        .sort();

      this.emitFile({
        type: 'asset',
        fileName: 'offline-assets.json',
        source: JSON.stringify(assets),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineAssetManifest()],
  build: {
    outDir: 'dist',
  },
});
