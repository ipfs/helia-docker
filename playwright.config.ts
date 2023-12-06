import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { PORT } from './src/constants.js'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: (process.env.CI != null) ? 2 : 0,
  /**
   * Opt out of parallel tests by setting workers to 1.
   * We don't want to bombard Helia gateway with parallel requests, it's not ready for that yet.
   */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry'
  },
  maxFailures: 5,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: (process.env.DOCTOR != null) ? 'npm run start:dev-doctor' : 'npm run start:dev',
    port: PORT,
    // Tiros does not re-use the existing server.
    reuseExistingServer: process.env.CI == null,
    env: {
      DEBUG: process.env.DEBUG ?? ' ',
      USE_BITSWAP: 'false',
      // we save to the filesystem so github CI can cache the data.
      FILE_BLOCKSTORE_PATH: join(process.cwd(), 'test', 'fixtures', 'e2e', 'blockstore'),
      FILE_DATASTORE_PATH: join(process.cwd(), 'test', 'fixtures', 'e2e', 'datastore')
    }
  }
})
