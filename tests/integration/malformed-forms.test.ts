import { test, expect, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	getEventName,
	getScheduleCount,
	insertVenue,
	venueExists,
	getLocationCoords,
	closeDb
} from './helpers/db';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

/** Use the actual form ID and field names, then attack its enhanced endpoint. */
async function postForm(
	page: Page,
	remote: string,
	overrides: Record<string, string>,
	mode = 'fields'
) {
	const result = await page.evaluate(
		async ({ remote, overrides, mode }) => {
			const form = [...document.querySelectorAll('form')].find(
				(form) => new URL(form.action).searchParams.get('/remote')?.split('/')[1] === remote
			);
			if (!form) return null;
			const id = new URL(form.action).searchParams.get('/remote')!;
			const endpoint = `/_app/remote/${id.split('/').slice(0, 2).join('/')}`;
			const data = new FormData(form);
			for (const [field, value] of Object.entries(overrides)) {
				const key = [...data.keys()].find(
					(key) => key.split('/')[0].replace(/^[nb]:/, '') === field
				);
				// Optional inputs can be absent from FormData; use the form's own suffix.
				const suffix = [...data.keys()][0]?.slice([...data.keys()][0].indexOf('/'));
				if (!key && !suffix) throw new Error(`Cannot locate Kit form ID for ${field}`);
				data.set(key ?? `${field}${suffix}`, value);
			}
			if (mode === 'unbound') data.set('unbound', 'value');
			if (mode === 'duplicate') {
				const key = [...data.keys()][0];
				data.append(key, 'duplicate');
			}
			if (mode === 'forbidden') {
				const key = [...data.keys()][0];
				data.set(`__proto__.polluted${key.slice(key.indexOf('/'))}`, 'yes');
			}
			const binary = mode.startsWith('binary:');
			const multipart = mode === 'multipart';
			// A valid binary-form header (version 0, data length, no files) followed
			// by data Kit's decoder throws on: past the checks Kit answers itself.
			const header = new TextEncoder().encode(mode.slice('binary:'.length));
			const bytes = new Uint8Array(7 + header.length);
			new DataView(bytes.buffer).setUint32(1, header.length, true);
			bytes.set(header, 7);
			const response = await fetch(endpoint, {
				method: 'POST',
				body: binary ? bytes : multipart ? 'broken multipart' : data,
				headers: {
					'x-sveltekit-pathname': location.pathname,
					'x-sveltekit-search': location.search,
					...(binary
						? { 'content-type': 'application/x-sveltekit-formdata' }
						: multipart
							? { 'content-type': 'multipart/form-data; boundary=missing' }
							: {})
				}
			});
			return { status: response.status, body: await response.text() };
		},
		{ remote, overrides, mode }
	);
	await page.waitForLoadState('networkidle');
	expect(result, `live ${remote} form`).not.toBeNull();
	return result!;
}

test.describe('malformed remote forms', () => {
	let eventId: string;
	test.beforeEach(async () => {
		eventId = await createTestEvent(await getTestUserId(TEST_USER.email), {
			name: 'Malformed Forms Event'
		});
	});
	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});
	test.afterAll(async () => {
		await closeDb();
	});

	test('invalid image dimensions and NUL text fail validation without saving', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto(`/events/${eventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		for (const overrides of <Record<string, string>[]>[
			{ pictureWidth: 'abc' },
			{ pictureHeight: '2147483648' },
			{ name: 'bad\0name' }
		]) {
			const result = await postForm(page, 'updateEvent', {
				...overrides,
				name: overrides.name ?? 'Should not save'
			});
			// Kit returns form issues as a 200 result; it must never be an error/500.
			expect(result.status).toBe(200);
			expect(JSON.parse(result.body).type).toBe('result');
			expect(result.body).toContain('issues');
			expect(result.body).not.toContain('errorId');
			await expect.poll(() => getEventName(eventId)).toBe('Malformed Forms Event');
		}
		const valid = await postForm(page, 'updateEvent', { name: 'Valid Form Event' });
		expect(valid.status).toBe(200);
		expect(valid.body).not.toContain('issues');
		await expect.poll(() => getEventName(eventId)).toBe('Valid Form Event');
	});

	for (const mode of [
		'unbound',
		'duplicate',
		'forbidden',
		'binary:x',
		'binary:[null]',
		'binary:[{}]',
		'multipart'
	]) {
		test(`malformed ${mode} encoding is 400 before the callback`, async ({ page }) => {
			expectConsoleErrors(page);
			await page.goto(`/events/${eventId}/admin/edit`);
			await page.waitForLoadState('networkidle');
			const result = await postForm(page, 'updateEvent', { name: 'Should not save' }, mode);
			// Kit answers a remote error as HTTP 200 with the status in the body.
			expect(result.status).toBeLessThan(500);
			expect(JSON.parse(result.body)).toMatchObject({ type: 'error', error: { status: 400 } });
			expect(result.body).not.toContain('errorId');
			await expect.poll(() => getEventName(eventId)).toBe('Malformed Forms Event');
		});
	}

	test('bad schedule dates and venue IDs cannot insert rows', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto(`/events/${eventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		for (const overrides of <Record<string, string>[]>[
			{ startDate: 'x' },
			{ endDate: '2030-06-01T09:00' },
			{ locationId: 'abc' }
		]) {
			const result = await postForm(page, 'addSchedule', {
				eventId,
				name: 'Should not insert',
				startDate: '2030-06-01T10:00',
				endDate: '2030-06-01T11:00',
				...overrides
			});
			expect(result.status).toBe(200);
			expect(result.body).toContain('issues');
			expect(result.body).not.toContain('errorId');
			await expect.poll(() => getScheduleCount(eventId)).toBe(0);
		}
		const valid = await postForm(page, 'addSchedule', {
			eventId,
			name: 'Valid schedule',
			startDate: '2030-06-01T10:00',
			endDate: '2030-06-01T11:00'
		});
		expect(valid.status).toBe(200);
		expect(valid.body).not.toContain('issues');
		await expect.poll(() => getScheduleCount(eventId)).toBe(1);
	});

	// Finite, so they passed the old check, but Postgres `real` overflows (22003).
	test('out-of-range venue coordinates fail validation without inserting', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto(`/events/${eventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Add Location' }).click();
		await expect(page.getByTestId('location-name-input')).toBeVisible();
		for (const [latitude, longitude] of [
			['1e100', '10'],
			['10', '1e100'],
			['-91', '10'],
			['10', '181']
		]) {
			const result = await postForm(page, 'createEventLocation', {
				eventId,
				name: 'Overflow venue',
				latitude,
				longitude
			});
			expect(result.status).toBe(200);
			expect(result.body).toContain('issues');
			expect(result.body).not.toContain('errorId');
			await expect.poll(() => getLocationCoords(eventId, 'Overflow venue')).toBeNull();
		}
		const valid = await postForm(page, 'createEventLocation', {
			eventId,
			name: 'Edge venue',
			latitude: '90',
			longitude: '-180'
		});
		expect(valid.status).toBe(200);
		expect(valid.body).not.toContain('issues');
		await expect
			.poll(() => getLocationCoords(eventId, 'Edge venue'))
			.toEqual({ latitude: 90, longitude: -180 });
	});

	test('malformed venue deletion cannot delete the venue', async ({ page }) => {
		expectConsoleErrors(page);
		const venueId = await insertVenue(eventId, 'Keep this venue');
		await page.goto(`/events/${eventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');
		const result = await postForm(page, 'deleteEventLocation', { id: 'abc', eventId });
		expect(result.status).toBe(200);
		expect(result.body).toContain('issues');
		await expect.poll(() => venueExists(venueId)).toBe(true);
	});

	test('malformed upload body is JSON 400', async ({ page }) => {
		expectConsoleErrors(page);
		const response = await page.request.post('/api/events/upload-image', {
			headers: { 'content-type': 'multipart/form-data; boundary=missing' },
			data: 'broken multipart'
		});
		expect(response.status()).toBe(400);
		expect(await response.json()).toEqual({ error: 'Invalid multipart body' });
	});
});
