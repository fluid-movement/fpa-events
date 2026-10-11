import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Markdown from outside the app — today only player bios from fpa-profiles —
 * rendered to HTML that is safe for `{@html}`.
 *
 * Server-only so the parser never ships to the browser. `breaks` because the
 * text was written for the old WordPress site, where a single newline was a
 * line break.
 */
const marked = new Marked({ gfm: true, breaks: true, async: false });

const OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'br',
		'strong',
		'em',
		'h3',
		'h4',
		'ul',
		'ol',
		'li',
		'blockquote',
		'code',
		'pre',
		'hr',
		'a'
	],
	// `target` and `rel` are set by the transform below, which overrides
	// whatever the source said; the whitelist runs after it.
	allowedAttributes: { a: ['href', 'target', 'rel'] },
	allowedSchemes: ['http', 'https', 'mailto'],
	// The page already has an h1 and section h2s; a bio's headings sit below them.
	transformTags: {
		h1: 'h3',
		h2: 'h3',
		h5: 'h4',
		h6: 'h4',
		a: sanitizeHtml.simpleTransform('a', {
			target: '_blank',
			rel: 'noopener noreferrer nofollow'
		})
	}
};

export function renderMarkdown(markdown: string): string {
	return sanitizeHtml(marked.parse(markdown) as string, OPTIONS).trim();
}
