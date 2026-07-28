import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load the test environment before anything else reads process.env — the
// direct-SQL helpers in tests/integration/helpers/db.ts depend on
// DATABASE_URL pointing at the *test* database, not the dev one.
// First file wins (dotenv never overwrites an already-set variable), so the
// gitignored .env.test.local can override the committed .env.test.
config({ path: ['.env.test.local', '.env.test'] });

// Deliberately not 5173: the dev server owns that port. Sharing it would let
// `reuseExistingServer` silently attach to a dev server wired to the dev
// database, which is exactly what this setup exists to prevent.
const PORT = 5174;

export default defineConfig({
	testDir: './tests/integration',
	fullyParallel: false,
	// The specs share one database and one seeded auth user, so they must stay
	// serial. Parallelising them is a separate project.
	workers: 1,
	// One local retry absorbs the occasional flake that would otherwise train
	// you to reach for `git push --no-verify`.
	retries: process.env.CI ? 2 : 1,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'vp run dev:test',
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe'
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/
		},
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.auth/user.json'
			},
			dependencies: ['setup']
		}
	]
});
