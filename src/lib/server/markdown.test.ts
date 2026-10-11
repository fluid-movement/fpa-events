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

	it('demotes headings below the page and section headings', () => {
		expect(renderMarkdown('# Title')).toBe('<h3>Title</h3>');
	});
});
