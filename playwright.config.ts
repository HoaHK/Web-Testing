import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Local test data (payment cards, customer info); .env is gitignored.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: process.env.CI ? 'never' : 'always' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL ?? 'https://boreas.zenkiet.dev/online-ordering/staging/',
        // The HTTPS app calls its API on a private LAN address; Chrome blocks that without this permission.
        permissions: ['local-network-access'],
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL ?? 'http://192.168.1.194:6969' },
    },
  ],
});
