import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	deleteEventsByName,
	setEventPicture,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';

const NAME = 'Link Preview "Quoted" Event';
const PICTURE = 'https://pictures.example.test/preview.jpg';

test.describe('link previews', () => {
	let eventId: string;

	test.beforeAll(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		await deleteEventsByName(NAME);
		eventId = await createTestEvent(userId, { name: NAME });
		await setEventPicture(eventId, PICTURE);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await closeDb();
	});

	// Crawlers do not run JS, so read the raw server response, not a rendered page.
	test('an event page carries its Open Graph tags in the server HTML', async ({ request }) => {
		const html = await (await request.get(`/events/${eventId}`)).text();

		expect(html).toContain('property="og:title" content="Link Preview &quot;Quoted&quot; Event"');
		expect(html).toContain(`property="og:image" content="${PICTURE}"`);
		expect(html).toContain('name="twitter:card" content="summary_large_image"');
		expect(html).toMatch(new RegExp(`property="og:url" content="http://[^"]+/events/${eventId}"`));
		expect(html).toContain('Test Location');
	});

	test('other pages carry the site-wide default', async ({ request }) => {
		const html = await (await request.get('/')).text();
		expect(html).toContain('property="og:title" content="FPA Events"');
		expect(html).not.toContain('og:image');
	});

	test('a token route never publishes its URL', async ({ request }) => {
		const token = 'SECRETTOKEN123';
		const html = await (await request.get(`/invite/${token}`)).text();
		const metaTags = html.match(/<meta[^>]*>/g)?.join('\n') ?? '';
		expect(metaTags).toContain('og:title');
		expect(metaTags).not.toContain('og:url');
		expect(metaTags).not.toContain(token);
	});
});
