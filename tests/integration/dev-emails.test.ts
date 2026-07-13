import { test, expect } from '@playwright/test';

test.describe('dev/email preview route', () => {
	test('loads and shows template tabs and preview iframe', async ({ page }) => {
		await page.goto('/dev/emails');
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('template-tab-activate-account')).toBeVisible();
		await expect(page.getByTestId('template-tab-reset-password')).toBeVisible();
		await expect(page.getByTestId('email-preview')).toBeVisible();
		await expect(page.getByText('Subject:')).toBeVisible();
	});

	test('switching templates updates the preview', async ({ page }) => {
		await page.goto('/dev/emails');
		await page.waitForLoadState('networkidle');

		const iframe = page.getByTestId('email-preview');
		await expect(iframe).toHaveAttribute('srcdoc', /Activate Account/);

		await page.getByTestId('template-tab-reset-password').click();
		await expect(iframe).toHaveAttribute('srcdoc', /Reset Password/);
	});

	test('view source toggle reveals raw HTML', async ({ page }) => {
		await page.goto('/dev/emails');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('toggle-source').click();
		await expect(page.getByTestId('email-source')).toBeVisible();
		await expect(page.getByTestId('email-preview')).toBeHidden();

		await page.getByTestId('toggle-source').click();
		await expect(page.getByTestId('email-preview')).toBeVisible();
		await expect(page.getByTestId('email-source')).toBeHidden();
	});

	test('send test email form is present', async ({ page }) => {
		await page.goto('/dev/emails');
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('test-email-input')).toBeVisible();
		await expect(page.getByTestId('send-test-email')).toBeVisible();
	});
});
