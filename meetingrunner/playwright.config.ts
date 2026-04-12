import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev -w packages/server',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'npm run dev -w packages/client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
