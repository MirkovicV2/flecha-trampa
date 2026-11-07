import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: 'campaign-upgrade.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:49187' },
  webServer: {
    command: 'npm run preview -- --port 49187 --strictPort',
    url: 'http://127.0.0.1:49187',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
