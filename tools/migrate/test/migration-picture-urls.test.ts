import { afterEach, describe, expect, it, vi } from 'vitest';
import { legacyPictureUrl } from '../src/picture-policy';
import { migrateAll } from '../src/orchestrate';
import { offline } from './helpers/offline';

afterEach(() => vi.restoreAllMocks());

const resolvable = [
	['pictures/photo#one.png', 'pictures/photo%23one.png'],
	['pictures/photo?one.png', 'pictures/photo%3Fone.png'],
	['pictures/%2e%2e/%2F%23%3f.png', 'pictures/%252e%252e/%252F%2523%253f.png'],
	[' pictures/photo name.png \t\n', '%20pictures/photo%20name.png%20%09%0A'],
	['pictures/100%.png', 'pictures/100%25.png'],
	['pictures/é.png', 'pictures/%C3%A9.png'],
	['pictures/a\\b.png', 'pictures/a%5Cb.png'],
	['pictures/.hidden/.../photo.png', 'pictures/.hidden/.../photo.png']
];

function scenario(key: string) {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	const f = offline();
	f.fixture.rows.events[0].picture = key;
	f.sourceObjects[key] = { contentType: 'image/png', body: [4, 5, 6] };
	return f;
}

describe('picture URLs must request the verified object', () => {
	it.each(resolvable)(
		'encodes %j and verifies the browser-resolved key independently',
		async (key, encodedPath) => {
			const f = scenario(key);
			await migrateAll(f.options, f.adapters);
			const picture = f.state.tables.events[0][8] as string;
			expect(picture).toBe(`https://pictures.example/${encodedPath}`);
			const request = new URL(picture);
			expect(request.search).toBe('');
			expect(request.hash).toBe('');
			expect(decodeURIComponent(request.pathname.slice(1))).toBe(key);
			expect(f.state.objects[key]).toEqual(f.sourceObjects[key]);
			expect(
				f.state.commands.filter((c) => c.side === 'target' && c.name === 'HeadObjectCommand').at(-1)
					?.key
			).toBe(key);
		}
	);

	it.each([
		'pictures/./photo.png',
		'pictures/../photo.png',
		'./photo.png',
		'../photo.png',
		'pictures/.',
		'pictures/..'
	])('rejects unrepresentable dot-segment key %j before any target R2 write', async (key) => {
		const f = scenario(key);
		const original = structuredClone(f.state.objects);
		await expect(migrateAll(f.options, f.adapters)).rejects.toThrow('unresolvable dot segment');
		expect(f.state.objects).toEqual(original);
		expect(f.state.tables).toEqual(f.fixture.initialTables);
		expect(f.state.queries).not.toContain('COMMIT');
	});

	it.each([
		['pictures/photo#one.png', 'https://pictures.example/pictures/photo#one.png'],
		['pictures/photo?one.png', 'https://pictures.example/pictures/photo?one.png'],
		['pictures/%23.png', 'https://pictures.example/pictures/%23.png'],
		['pictures/photo.png ', 'https://pictures.example/pictures/photo.png '],
		['pictures/a\nb.png', 'https://pictures.example/pictures/a\nb.png'],
		['pictures/../photo.png', 'https://pictures.example/pictures/../photo.png']
	])(
		'rejects corrupt stored URL %j -> %j without trusting the URL builder',
		async (key, badUrl) => {
			const f = scenario(key);
			// Use a normal source key for the dot fixture so import itself succeeds;
			// the verifier must still reject the injected dot-segment URL independently.
			if (key.includes('/../')) {
				f.fixture.rows.events[0].picture = 'pictures/photo.png';
				f.sourceObjects['pictures/photo.png'] = { contentType: 'image/png' };
			}
			f.state.pictureUrlOverride = badUrl;
			const original = structuredClone(f.state.objects);
			await expect(migrateAll(f.options, f.adapters)).rejects.toThrow('Event picture URLs differ');
			expect(f.state.objects).toEqual(original);
			expect(f.state.queries).not.toContain('COMMIT');
		}
	);

	it('handles a public URL path prefix without changing the requested key', async () => {
		const f = scenario('pictures/a?#.png');
		f.options.publicUrl = 'https://pictures.example/assets/';
		await migrateAll(f.options, f.adapters);
		expect(f.state.tables.events[0][8]).toBe(
			'https://pictures.example/assets/pictures/a%3F%23.png'
		);
	});

	it.each([
		'https://pictures.example/?query=1',
		'https://pictures.example/#fragment',
		'https://user:pass@pictures.example',
		'ftp://pictures.example'
	])('rejects an ambiguous public base URL %j', (base) => {
		expect(() => legacyPictureUrl(base, 'pictures/photo.png')).toThrow('Picture public URL');
	});
});
