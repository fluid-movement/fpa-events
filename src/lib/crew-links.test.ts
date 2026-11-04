import { describe, expect, it } from 'vitest';
import {
	CREW_LINK_KINDS,
	CREW_LINK_LABELS,
	MAX_LINK_URL_LENGTH,
	normalizeLinkUrl
} from './crew-links';

describe('crew link URLs', () => {
	it('keeps a fixed, unique display order with a label for every kind', () => {
		expect(new Set(CREW_LINK_KINDS).size).toBe(9);
		expect(CREW_LINK_KINDS[0]).toBe('website');
		for (const kind of CREW_LINK_KINDS) expect(CREW_LINK_LABELS[kind]).toBeTruthy();
	});
	it('trims URLs and uses empty input to clear a link', () => {
		expect(normalizeLinkUrl('website', ' https://example.com/crew?q=one#two ')).toBe(
			'https://example.com/crew?q=one#two'
		);
		expect(normalizeLinkUrl('instagram', ' \n\t ')).toBe('');
		expect(normalizeLinkUrl('other', 'https://example.org')).toBe('https://example.org');
	});
	it.each([
		'javascript:alert(1)',
		'data:text/html,hello',
		'http://example.com',
		'ftp://example.com',
		'//example.com',
		'example.com',
		'/relative',
		'https://',
		'https://user:secret@example.com',
		'https://example.com/\u0000',
		'https://exam\nple.com',
		'https:\\example.com',
		'https://example.com/a b'
	])('rejects unsafe or malformed input: %s', (input) => {
		expect(() => normalizeLinkUrl('website', input)).toThrow();
	});
	it('limits the stored length', () => {
		const exact = 'https://example.com/' + 'a'.repeat(MAX_LINK_URL_LENGTH - 20);
		expect(normalizeLinkUrl('website', exact)).toBe(exact);
		expect(() => normalizeLinkUrl('website', exact + 'a')).toThrow('2048');
	});
	it.each([
		['instagram', 'https://www.instagram.com/crew'],
		['facebook', 'https://facebook.com/crew'],
		['youtube', 'https://youtu.be/123'],
		['tiktok', 'https://www.tiktok.com/@crew'],
		['discord', 'https://discord.gg/crew'],
		['discord', 'https://discord.com/invite/crew'],
		['whatsapp', 'https://wa.me/123'],
		['whatsapp', 'https://chat.whatsapp.com/crew'],
		['telegram', 'https://t.me/crew'],
		['telegram', 'https://telegram.me/crew']
	] as const)('accepts %s platform URL %s', (kind, input) => {
		expect(normalizeLinkUrl(kind, input)).toBe(input);
	});
	it.each(CREW_LINK_KINDS.filter((kind) => kind !== 'website' && kind !== 'other'))(
		'rejects a foreign or spoofed host for %s',
		(kind) => {
			for (const input of [
				'https://example.com',
				`https://${kind}.com.evil.example/crew`,
				`https://${kind}.com@evil.example/crew`
			]) {
				expect(() => normalizeLinkUrl(kind, input)).toThrow();
			}
		}
	);
});
