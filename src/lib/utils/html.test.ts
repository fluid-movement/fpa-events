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
	it.each([
		['ampersands', '<p>Tom &amp; Jerry</p>', 'Tom & Jerry'],
		['encoded markup', '&lt;b&gt;', '<b>'],
		['other common entities', '&quot;Hi&#39;&nbsp;&lt;&gt;', '"Hi\' <>'],
		['decimal entities', '&#65;&#38;&#160;&#128512;', 'A& 😀'],
		['hexadecimal entities', '&#x41;&#x26;&#xa0;&#x1F600;', 'A& 😀'],
		['one decoding pass', '&amp;lt;b&amp;gt;', '&lt;b&gt;'],
		['script contents', 'Before<script>alert(1)</script>after', 'Before after'],
		['style contents', 'Before<style>p { color: red; }</style>after', 'Before after'],
		[
			'nested tags',
			'<div>One<strong>Two<em>Three</em>Four</strong>Five</div>',
			'One Two Three Four Five'
		],
		['adjacent tags', '<p>One</p><p>Two</p>', 'One Two'],
		['mixed whitespace', ' \tOne&nbsp;\n Two\r\n ', 'One Two'],
		['empty input', '', '']
	])('handles %s', (_name, input, expected) => {
		expect(stripHtml(input)).toBe(expected);
	});

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

	// Browsers parse these containers' contents differently from a plain tag (as
	// raw text, or into a separate fragment) — the place sanitizers have
	// historically disagreed with the browser. The container may vanish or leave
	// its contents as escaped text, but no tag may survive beside the allowed <p>.
	it.each(['textarea', 'template', 'noembed'])(
		'leaves no live markup from an img onerror inside <%s>',
		(tag) => {
			const output = sanitizeRichText(`<p>ok</p><${tag}><img src=x onerror=alert(1)></${tag}>`);
			expect(output.startsWith('<p>ok</p>')).toBe(true);
			expect(output.slice('<p>ok</p>'.length)).not.toMatch(/[<>]/);
		}
	);

	it('drops a javascript: link, keeping only its text', () => {
		const output = sanitizeRichText('<p>see <a href="javascript:alert(1)">this</a></p>');
		expect(output).toBe('<p>see this</p>');
		expect(output).not.toMatch(/javascript:/i);
	});
});
