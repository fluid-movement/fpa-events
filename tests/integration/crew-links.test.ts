import { expect, test, type Page } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	deleteCrewsInCountry,
	deleteUserByEmail,
	getTestUserId,
	sql
} from './helpers/db';
import { signUpAndSignIn } from './helpers/auth';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import { callRemoteForm, captureRemoteForm } from './helpers/forms';

installErrorGuard(test);
const COUNTRY = 'Crewlinksland';
const OTHER = { email: 'crew-links-member@playwright.local', password: 'playwright-test-pw-123' };

async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}
async function storedLinks(crewId: string) {
	return sql()`SELECT kind, url FROM crew_links WHERE crew_id = ${crewId} ORDER BY kind`;
}

test.describe('crew contact links', () => {
	let crewId: string;
	test.beforeEach(async () => {
		await deleteCrewsInCountry(COUNTRY);
		crewId = await createTestCrew(await getTestUserId(TEST_USER.email), 'Crew Links Town', COUNTRY);
	});
	test.afterAll(async () => {
		await deleteCrewsInCountry(COUNTRY);
		await deleteUserByEmail(OTHER.email);
		await closeDb();
	});

	test('admin saves all kinds, sees the icon links and clears them', async ({ page }) => {
		await open(page, `/crews/${crewId}`);
		await expect(page.getByTestId('crew-contact-links')).toHaveCount(0);
		await open(page, `/crews/${crewId}/admin`);
		await page.getByTestId('manage-crew-links').click();
		await page.waitForLoadState('networkidle');
		const links = {
			website: 'https://example.com/crew',
			instagram: 'https://instagram.com/crew',
			facebook: 'https://facebook.com/crew',
			youtube: 'https://youtube.com/@crew',
			tiktok: 'https://tiktok.com/@crew',
			discord: 'https://discord.gg/crew',
			whatsapp: 'https://chat.whatsapp.com/crew',
			telegram: 'https://t.me/crew',
			other: 'https://example.org/contact'
		};
		for (const [kind, url] of Object.entries(links))
			await page.getByTestId(`crew-link-input-${kind}`).fill(url);
		await page.getByTestId('crew-links-submit').click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('status')).toHaveText('Contact links saved.');
		await expect.poll(async () => (await storedLinks(crewId)).length).toBe(9);
		await open(page, `/crews/${crewId}`);
		for (const [kind, url] of Object.entries(links)) {
			const link = page.getByTestId(`crew-contact-${kind}`);
			await expect(link).toHaveAttribute('href', url);
			await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link.locator('svg')).toHaveCount(1);
		}
		await open(page, `/crews/${crewId}/admin/links`);
		for (const kind of Object.keys(links))
			await page.getByTestId(`crew-link-input-${kind}`).fill('');
		await page.getByTestId('crew-links-submit').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await storedLinks(crewId)).length).toBe(0);
		await open(page, `/crews/${crewId}`);
		await expect(page.getByTestId('crew-contact-links')).toHaveCount(0);
	});

	test('rejects invalid and unsafe URLs without replacing saved links', async ({ page }) => {
		await open(page, `/crews/${crewId}/admin/links`);
		await page.getByTestId('crew-link-input-website').fill('https://example.com/keep');
		await page.getByTestId('crew-links-submit').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await storedLinks(crewId)).length).toBe(1);
		for (const value of ['not-a-url', 'javascript:alert(1)', 'http://example.com']) {
			await page.getByTestId('crew-link-input-website').fill(value);
			await page.getByTestId('crew-links-submit').click();
			await page.waitForLoadState('networkidle');
			await expect(page.getByRole('alert')).toHaveText('Enter a valid HTTPS URL.');
			await expect
				.poll(async () => (await storedLinks(crewId)).map((row) => row.url))
				.toEqual(['https://example.com/keep']);
		}
	});

	test('a member cannot load the editor or submit a captured admin form', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await open(page, `/crews/${crewId}/admin/links`);
		const captured = await captureRemoteForm(page, 'saveCrewLinks');
		await signUpAndSignIn(page, context, OTHER);
		await addCrewMember(crewId, await getTestUserId(OTHER.email), 'member');
		const response = await page.goto(`/crews/${crewId}/admin/links`);
		await page.waitForLoadState('networkidle');
		expect(response?.status()).toBe(403);
		expect(
			await callRemoteForm(page, captured, { website: 'https://example.com/forged' })
		).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(async () => (await storedLinks(crewId)).length).toBe(0);
	});
});
