import { defineConfig, devices } from '@playwright/test';

// Explicit opt-in only. No app test DB, server, auth setup or dotenv is loaded.
const enabled = process.env.MIGRATION_SMOKE === '1';
const baseURL = process.env.MIGRATION_SMOKE_BASE_URL;
if (enabled) {
	if (!baseURL) throw new Error('MIGRATION_SMOKE_BASE_URL is required');
	const url = new URL(baseURL);
	if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
		throw new Error('Use an http(s) smoke base URL without embedded credentials');
	}
}

export default defineConfig({
	testDir: './smoke',
	testMatch: '**/*.spec.ts',
	workers: 1,
	retries: 0,
	timeout: 90_000,
	reporter: 'list',
	outputDir: './test-results',
	use: {
		...devices['Desktop Chrome'],
		baseURL,
		// Credentials and the private calendar token must not land in artifacts.
		trace: 'off',
		screenshot: 'off',
		video: 'off',
		actionTimeout: 15_000
	}
});
