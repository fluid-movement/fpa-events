import { describe, expect, it } from 'vitest';
import { safeRedirectPath, withRedirect } from './urls';

describe('safeRedirectPath', () => {
	it('keeps a same-origin path with its query and hash', () => {
		expect(safeRedirectPath('/invite/abc?x=1#top', '/dashboard')).toBe('/invite/abc?x=1#top');
	});

	it.each([
		['nothing', null],
		['an empty string', ''],
		['an absolute URL', 'https://evil.example.com/'],
		['a protocol-relative URL', '//evil.example.com/'],
		['a backslash trick', '/\\evil.example.com/'],
		['a relative path', 'invite/abc'],
		['a javascript: URL', 'javascript:alert(1)']
	])('falls back for %s', (_label, value) => {
		expect(safeRedirectPath(value, '/dashboard')).toBe('/dashboard');
	});
});

describe('withRedirect', () => {
	it('encodes the destination', () => {
		expect(withRedirect('/sign-up', '/invite/abc?x=1')).toBe(
			'/sign-up?redirect=%2Finvite%2Fabc%3Fx%3D1'
		);
	});

	it('leaves the path alone when there is nowhere to return to', () => {
		expect(withRedirect('/sign-up', null)).toBe('/sign-up');
	});
});
