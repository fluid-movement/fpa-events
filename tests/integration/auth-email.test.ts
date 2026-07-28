import { test, expect } from '@playwright/test';
import { sql } from './helpers/db';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

test.describe('sign-up email verification flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'verify-flow-test@playwright.local';
	const password = 'test-pw-verify-123';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows activation prompt after sign-up with unverified email', async ({ page }) => {
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Verify');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByText(/verification email/i)).toBeVisible();
	});

	test('does not leak email existence on re-registration', async ({ page }) => {
		// Sign up again with the same email — should show same message
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Verify');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/verification email/i)).toBeVisible();
	});

	test('cannot sign in with unverified email', async ({ page }) => {
		await page.goto('/sign-in');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForTimeout(2000);

		await expect(page.getByText(/verify/i)).toBeVisible();
	});

	test('can sign in after verifying email', async ({ page }) => {
		// Manually verify the email (simulates clicking the verification link)
		await sql()`UPDATE "user" SET email_verified = true WHERE email = ${email}`;

		await page.goto('/sign-in');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();

		await page.waitForURL(/\/dashboard/, { timeout: 15000 });
		await expect(page).toHaveURL(/\/dashboard/);
	});
});

test.describe('resend verification flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'resend-test@playwright.local';
	const password = 'test-pw-resend-123';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows resend verification button after failed sign-in', async ({ page, context }) => {
		await context.clearCookies();

		// Sign up
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Resend');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page.getByText(/verification email/i)).toBeVisible();

		// Navigate to sign-in page
		await page.goto('/sign-in');

		// Attempt sign-in with unverified email
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForLoadState('networkidle');

		// Check that a resend verification button is visible
		const resendBtn = page.getByRole('button', { name: /resend.*verification/i });
		await expect(resendBtn).toBeVisible();

		// Click resend
		await resendBtn.click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(/verification email sent|sent/i)).toBeVisible();
	});
});

test.describe('forgot-password flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'forgot-pw-test@playwright.local';
	const newPassword = 'new-pw-forgot-456';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
		const id = 'forgot-pw-' + Date.now();
		await sql()`
			INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
			VALUES (${id}, 'Forgot PW Test', ${email}, true, 'user', now(), now())
		`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows success message after requesting reset link', async ({ page, context }) => {
		await context.clearCookies();

		await page.goto('/forget-password');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByRole('button', { name: 'Send reset link' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/check your inbox|sent/i)).toBeVisible();
	});

	test('can reset password and sign in with new password', async ({ page, context }) => {
		await context.clearCookies();

		// Request a password reset via the client (which uses the correct API endpoint)
		await page.goto('/forget-password');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByRole('button', { name: 'Send reset link' }).click();
		await page.waitForLoadState('networkidle');

		// Extract the verification token from the table
		const [row] = await sql()<[{ identifier: string }]>`
			SELECT v.identifier FROM verification v
			JOIN "user" u ON u.id = v.value
			WHERE v.identifier LIKE 'reset-password:%' AND u.email = ${email}
			ORDER BY v.created_at DESC LIMIT 1
		`;
		expect(row).toBeTruthy();
		const token = row.identifier.replace('reset-password:', '');
		expect(token).toBeTruthy();

		// Reset the password using the token
		await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
		await page.waitForLoadState('networkidle');

		await page.getByLabel('New Password').fill(newPassword);
		await page.getByLabel('Confirm Password').fill(newPassword);
		await page.getByRole('button', { name: 'Reset password' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/sign-in/);

		// Sign in with the new password
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(newPassword);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/dashboard/);
	});
});
