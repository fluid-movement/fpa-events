import { describe, expect, it } from 'vitest';
import { isUploadedPictureUrl } from './eventForm';

// The gate that stops an organizer adopting someone else's picture URL (and
// then having the server delete it on replace).
describe('isUploadedPictureUrl', () => {
	const PUBLIC = 'https://cdn.example.com';

	it('accepts a fresh upload key', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, PUBLIC)).toBe(true);
	});

	it('tolerates a trailing slash on the configured public URL', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, `${PUBLIC}/`)).toBe(true);
	});

	it.each([
		['another host', 'https://evil.example.com/events/01abc.jpg'],
		['a legacy pictures/ key', `${PUBLIC}/pictures/old.jpg`],
		['a nested path', `${PUBLIC}/events/../pictures/old.jpg`],
		['a lookalike host', `${PUBLIC}.evil.com/events/01abc.jpg`]
	])('rejects %s', (_label, url) => {
		expect(isUploadedPictureUrl(url, PUBLIC)).toBe(false);
	});

	it('accepts nothing when no bucket is configured', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, '')).toBe(false);
	});
});
