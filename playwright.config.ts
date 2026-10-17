import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://localhost:4500', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm start',
      url: 'http://localhost:4500/api/health',
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm embeds:start',
      url: 'http://localhost:4501/health',
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
})
