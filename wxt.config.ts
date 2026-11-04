import { defineConfig } from 'wxt';

/**
 * CSP rigida per le pagine dell'estensione: nessuno script esterno e
 * nessuna connessione di rete (connect-src 'none').
 * Applicata solo alla build di produzione: in sviluppo WXT deve collegarsi
 * a localhost per il ricaricamento automatico.
 */
const STRICT_CSP = "script-src 'self'; object-src 'self'; connect-src 'none'";

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  browser: 'firefox',
  targetBrowsers: ['firefox'],
  manifestVersion: 3,
  manifest: ({ command }) => ({
    name: 'Action Alligator',
    description: 'Ti ricorda di applicare ciò che hai già imparato.',
    permissions: ['storage', 'alarms', 'notifications', 'idle', 'scripting'],
    // Il post-it chiede il permesso solo per i siti che scegli tu.
    optional_host_permissions: ['*://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'action-alligator@ariel.local',
        strict_min_version: '128.0',
        // L'estensione non raccoglie né trasmette alcun dato.
        data_collection_permissions: { required: ['none'] },
      },
    },
    ...(command === 'build'
      ? { content_security_policy: { extension_pages: STRICT_CSP } }
      : {}),
  }),
  zip: {
    excludeSources: ['.env*', 'coverage/**', 'scripts/out/**'],
  },
});
