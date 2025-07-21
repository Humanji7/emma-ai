import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: false, // Run tests sequentially for better debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for production testing
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'https://emma-ai-coaching.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true, // Set to false for visual debugging
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  outputDir: 'test-results/screenshots'
});