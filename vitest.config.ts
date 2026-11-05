import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // Sostituisce l'API browser con un finto browser in memoria (storage, allarmi, notifiche...).
  plugins: [WxtVitest()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
