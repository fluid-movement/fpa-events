import { test, expect } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	deleteCrewsInCountry,
	deleteUserByEmail,
	getTestUserId,
	sql
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { signUpAndSignIn } from './helpers/auth';
import { captureRemoteForm, callRemoteForm, postRemoteForm } from './helpers/forms';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);
const COUNTRY = 'Crew media spec';
const OTHER = { email: 'crew-media@playwright.local', password: 'playwright-test-pw-123' };
let crewId: string;
async function stored() {
	const [row] =
		await sql()`SELECT picture, picture_width, picture_height, body, body_lang FROM crews WHERE id = ${crewId}`;
	return row;
}
test.beforeEach(async () => {
	await deleteCrewsInCountry(COUNTRY);
	crewId = await createTestCrew(await getTestUserId(TEST_USER.email), 'Media crew', COUNTRY);
});
test.afterEach(async () => {
	await deleteCrewsInCountry(COUNTRY);
	await deleteUserByEmail(OTHER.email);
});
test.afterAll(closeDb);

test('admin saves sanitized body and language; translations stay text and restore original markup', async ({
	page
}) => {
	await page.goto(`/crews/${crewId}/admin`);
	await page.waitForLoadState('networkidle');
	const form = await captureRemoteForm(page, 'updateCrew');
	await postRemoteForm(page, form, {
		body: '<p>Hallo <strong>Welt</strong></p><script>window.crewScriptRan=true</script>',
		bodyLang: 'de'
	});
	await expect.poll(async () => (await stored()).body).toBe('<p>Hallo <strong>Welt</strong></p>');
	await expect.poll(async () => (await stored()).body_lang).toBe('de');
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'languages', { value: ['en-US'] });
		Object.defineProperty(window, 'Translator', {
			configurable: true,
			value: {
				availability: async () => 'available',
				create: async () => ({
					translate: async (text: string) => `<em>${text}</em>`,
					destroy() {}
				})
			}
		});
	});
	await page.goto(`/crews/${crewId}`);
	await page.waitForLoadState('networkidle');
	const body = page.getByTestId('crew-body');
	await expect(body).toHaveAttribute('lang', 'de');
	await expect(page.locator('h1')).toHaveAttribute('translate', 'no');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await page.getByTestId('translate-text').click();
	await expect(body).toContainText('<em>Welt</em>');
	await expect(body.locator('em')).toHaveCount(0);
	await expect(body.locator('strong')).toHaveCount(1);
	await page.getByTestId('show-original').click();
	await expect(body).toHaveText('Hallo Welt');
	await expect(body).toHaveAttribute('lang', 'de');
});

for (const mode of ['absent', 'same-language', 'unavailable', 'failure'] as const) {
	test(`translation ${mode} keeps the original`, async ({ page }) => {
		await sql()`UPDATE crews SET body = '<p>Hallo Welt</p>', body_lang = 'de' WHERE id = ${crewId}`;
		await page.addInitScript((mode) => {
			Object.defineProperty(navigator, 'languages', {
				value: [mode === 'same-language' ? 'de-DE' : 'en-US']
			});
			if (mode === 'absent') {
				Reflect.deleteProperty(window, 'Translator');
				return;
			}
			Object.defineProperty(window, 'Translator', {
				configurable: true,
				value: {
					availability: async () => (mode === 'unavailable' ? 'unavailable' : 'available'),
					create: async () => ({
						translate: async () => {
							throw new Error('offline');
						}
					})
				}
			});
		}, mode);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		if (mode === 'failure') await page.getByTestId('translate-text').click();
		await expect(page.getByTestId('translate-text')).toHaveCount(0);
		await expect(page.getByTestId('crew-body')).toHaveText('Hallo Welt');
	});
}

test('rejects invalid body/language pairs and non-admin media edits', async ({ page, context }) => {
	expectConsoleErrors(page);
	await page.goto(`/crews/${crewId}/admin`);
	await page.waitForLoadState('networkidle');
	const form = await captureRemoteForm(page, 'updateCrew');
	for (const fields of [
		{ body: '<p>Hello</p>', bodyLang: '' },
		{ body: '', bodyLang: 'de' },
		{ body: '<p>Hello</p>', bodyLang: 'xx' }
	]) {
		await callRemoteForm(page, form, fields);
		await expect.poll(async () => (await stored()).body).toBeNull();
	}
	await signUpAndSignIn(page, context, OTHER);
	await addCrewMember(crewId, await getTestUserId(OTHER.email), 'member');
	const response = await callRemoteForm(page, form, {
		body: '<p>Hijacked</p>',
		bodyLang: 'en',
		picture: 'https://example.com/stolen.jpg'
	});
	expect(response).toMatchObject({ type: 'error', error: { status: 403 } });
	await expect.poll(async () => (await stored()).body).toBeNull();
	await expect.poll(async () => (await stored()).picture).toBeNull();
});

test('admin retains a sized banner, then removes it without leaving dimensions', async ({
	page
}) => {
	const picture = 'https://example.com/banner.png';
	await sql()`UPDATE crews SET picture = ${picture}, picture_width = 800, picture_height = 600 WHERE id = ${crewId}`;
	await page.route(picture, (route) =>
		route.fulfill({
			contentType: 'image/png',
			body: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
				'base64'
			)
		})
	);
	await page.goto(`/crews/${crewId}/admin`);
	await page.waitForLoadState('networkidle');
	await page.getByTestId('crew-submit').click();
	await page.waitForLoadState('networkidle');
	await page.goto(`/crews/${crewId}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('crew-banner')).toHaveAttribute('width', '800');
	await expect(page.getByTestId('crew-banner')).toHaveAttribute('height', '600');
	await page.goto(`/crews/${crewId}/admin`);
	await page.waitForLoadState('networkidle');
	await page.getByTestId('remove-image').click();
	await page.getByTestId('crew-submit').click();
	await page.waitForLoadState('networkidle');
	await expect
		.poll(async () => ({
			picture: (await stored()).picture,
			width: (await stored()).picture_width,
			height: (await stored()).picture_height
		}))
		.toEqual({ picture: null, width: null, height: null });
	await page.goto(`/crews/${crewId}`);
	await page.waitForLoadState('networkidle');
	await expect(page.getByTestId('crew-banner')).toHaveCount(0);
	await expect(page.locator('h1')).toHaveText('Media crew');
});

test('admin uploads and replaces a banner, releasing the old object', async ({ page }) => {
	test.skip(
		![
			'R2_ACCOUNT_ID',
			'R2_ACCESS_KEY_ID',
			'R2_SECRET_ACCESS_KEY',
			'R2_BUCKET_NAME',
			'R2_PUBLIC_URL'
		].every((key) => process.env[key]),
		'Requires a test R2 bucket; default .env.test intentionally has no R2 keys.'
	);
	const { S3Client, HeadObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
	const client = new S3Client({
		region: 'auto',
		endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: process.env.R2_ACCESS_KEY_ID!,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
		}
	});
	const keyFor = (url: string) => new URL(url).pathname.replace(/^\//, '');
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
		'base64'
	);
	let current: string | null = null;
	try {
		await page.goto(`/crews/${crewId}/admin`);
		await page.waitForLoadState('networkidle');
		await page
			.getByTestId('image-upload')
			.setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: png });
		await page.waitForLoadState('networkidle');
		await page.getByTestId('crew-submit').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await stored()).picture).toBeTruthy();
		const original = (await stored()).picture as string;
		current = original;
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('crew-banner')).toHaveAttribute('src', original);
		await page.goto(`/crews/${crewId}/admin`);
		await page.waitForLoadState('networkidle');
		await page
			.getByTestId('image-upload')
			.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: png });
		await page.waitForLoadState('networkidle');
		await page.getByTestId('crew-submit').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await stored()).picture).not.toBe(original);
		current = (await stored()).picture as string;
		await expect
			.poll(async () => {
				try {
					await client.send(
						new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: keyFor(original) })
					);
					return false;
				} catch (error) {
					if (
						(error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
					)
						return true;
					throw error;
				}
			})
			.toBe(true);
	} finally {
		if (current)
			await client.send(
				new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: keyFor(current) })
			);
		client.destroy();
	}
});
