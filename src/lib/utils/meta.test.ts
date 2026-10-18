import { describe, it, expect } from 'vitest';
import { eventMeta, canEmitUrl } from './meta';

const base = {
	name: 'Berlin Jam',
	startDate: new Date(2030, 4, 5),
	endDate: new Date(2030, 4, 8),
	location: 'Berlin, Germany',
	description: null,
	picture: null,
	pictureWidth: null,
	pictureHeight: null
};

describe('eventMeta', () => {
	it('leads with the dates and place', () => {
		expect(eventMeta(base).description).toBe('May 5, 2030 – May 8, 2030 · Berlin, Germany');
	});

	it('strips rich text to plain text, dropping tags and script', () => {
		const { description } = eventMeta({
			...base,
			description: '<p>Come <b>jam</b> "now"</p><script>alert(1)</script>'
		});
		expect(description).not.toMatch(/<\/?(p|b)>/);
		expect(description).toContain('Come jam "now"');
	});

	it('keeps quotes raw: attribute escaping belongs to the renderer', () => {
		expect(eventMeta({ ...base, name: 'The "Big" <Jam>' }).title).toBe('The "Big" <Jam>');
	});

	it('truncates long descriptions', () => {
		const { description } = eventMeta({ ...base, description: '<p>' + 'x'.repeat(500) + '</p>' });
		expect(description.length).toBeLessThanOrEqual(200);
		expect(description.endsWith('…')).toBe(true);
	});

	it('only carries an image when the event has a picture', () => {
		expect(eventMeta(base).image).toBeUndefined();
		expect(
			eventMeta({ ...base, picture: 'https://x.test/a.jpg', pictureWidth: 10, pictureHeight: 5 })
				.image
		).toEqual({ url: 'https://x.test/a.jpg', width: 10, height: 5 });
	});
});

describe('canEmitUrl', () => {
	it('withholds the URL on token-bearing routes', () => {
		expect(canEmitUrl('/invite/[token]')).toBe(false);
	});

	it('allows ordinary routes', () => {
		expect(canEmitUrl('/events/[id]')).toBe(true);
		expect(canEmitUrl('/')).toBe(true);
		expect(canEmitUrl(null)).toBe(true);
	});
});
