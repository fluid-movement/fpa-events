import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeRichText, stripHtml } from './html';

describe('escapeHtml', () => {
	it('neutralises a tag', () => {
		expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('escapes both quote characters, so an attribute cannot be broken out of', () => {
		expect(escapeHtml(`" onerror='x'`)).toBe('&quot; onerror=&#39;x&#39;');
	});

	it('escapes ampersands without double-escaping the result', () => {
		expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
	});

	it('leaves ordinary text alone', () => {
		expect(escapeHtml('Munich, Germany')).toBe('Munich, Germany');
	});
});

describe('stripHtml', () => {
	it('reduces markup to its text', () => {
		expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('collapses the whitespace left behind by removed tags', () => {
		expect(stripHtml('<p>One</p>\n<p>Two</p>')).toBe('One Two');
	});

	it('returns an empty string for markup with no text', () => {
		expect(stripHtml('<hr><br>')).toBe('');
	});
});

describe('sanitizeRichText', () => {
	it('keeps the tags the editor can produce', () => {
		expect(sanitizeRichText('<p>Hi <em>there</em></p>')).toBe('<p>Hi <em>there</em></p>');
	});

	it('drops a script tag and its contents', () => {
		expect(sanitizeRichText('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
	});

	it('strips attributes, including event handlers', () => {
		expect(sanitizeRichText('<p onclick="alert(1)" class="x">hi</p>')).toBe('<p>hi</p>');
	});

	it('removes tags outside the allow-list but keeps their text', () => {
		expect(sanitizeRichText('<div><p>kept</p></div>')).toBe('<p>kept</p>');
	});
});
