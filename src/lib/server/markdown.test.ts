import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('renders paragraphs, emphasis and single-newline breaks', () => {
		expect(renderMarkdown('Hello **world**\nnext line')).toBe(
			'<p>Hello <strong>world</strong><br />next line</p>'
		);
	});

	it('strips scripts and event handlers from raw HTML', () => {
		const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>ok');
		expect(html).not.toMatch(/script|onerror|<img/);
		expect(html).toContain('ok');
	});

	it('opens links externally and drops javascript: hrefs', () => {
		expect(renderMarkdown('[site](https://example.com)')).toBe(
			'<p><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">site</a></p>'
		);
		expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript');
	});

	it.each([
		['mixed case', '[x](JaVaScRiPt:alert(1))'],
		['entity-encoded', '[x](&#106;avascript:alert(1))'],
		['hex entity-encoded', '[x](&#x6A;avascript:alert(1))'],
		['leading space', '[x]( javascript:alert(1))'],
		['tab-split', '[x](java\tscript:alert(1))'],
		['data:', '[x](data:text/html,<script>alert(1)</script>)'],
		['vbscript:', '[x](vbscript:msgbox(1))'],
		['raw anchor', '<a href="JaVaScRiPt:alert(1)">x</a>'],
		['raw anchor, entity-encoded', '<a href="&#106;avascript:alert(1)">x</a>'],
		['raw anchor, data:', '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>']
	])('drops a %s link scheme', (_label, markdown) => {
		const html = renderMarkdown(markdown);
		expect(html).not.toMatch(/href|<script/i);
	});

	it('overrides target and rel set by the source', () => {
		expect(renderMarkdown('<a href="https://example.com" target="_self" rel="opener">x</a>')).toBe(
			'<p><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">x</a></p>'
		);
	});

	it('keeps mailto: links', () => {
		expect(renderMarkdown('[mail](mailto:a@example.com)')).toContain('href="mailto:a@example.com"');
	});

	it('demotes headings below the page and section headings', () => {
		expect(renderMarkdown('# Title')).toBe('<h3>Title</h3>');
	});
});
