import { test as setup, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { TEST_USER } from './helpers/constants';
import { sql } from './helpers/db';

const authFile = 'playwright/.auth/user.json';

setup('create test user and authenticate', async ({ page, request }) => {
	// Sign up (safe to call repeatedly — ignore if already exists)
	await request.post('/api/auth/sign-up/email', { data: TEST_USER });

	// With requireEmailVerification enabled, manually mark the test user as verified
	await sql()`UPDATE "user" SET email_verified = true WHERE email = ${TEST_USER.email}`;

	// Sign in via API to get session cookie
	const signInResp = await request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: TEST_USER.password, callbackURL: '/dashboard' }
	});
	expect(signInResp.ok()).toBeTruthy();

	// Load the homepage to seed the session cookie from Better Auth's set-cookie header
	await page.goto('/');
	// Use the session cookie from the sign-in response
	const cookies = await request.storageState();
	await page.context().addCookies(cookies.cookies);

	// Verify we're authenticated by navigating to a protected page
	await page.goto('/dashboard');
	await expect(page).not.toHaveURL(/sign-in/);

	// Persist the session cookies for all subsequent tests
	await mkdir('playwright/.auth', { recursive: true });
	await page.context().storageState({ path: authFile });
});
