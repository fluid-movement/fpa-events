import sanitizeHtml from 'sanitize-html';

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'br',
		'strong',
		'em',
		'h2',
		'h3',
		'ul',
		'ol',
		'li',
		'blockquote',
		'code',
		'pre',
		'hr'
	],
	allowedAttributes: {}
};

/** Whitelist the markup the rich-text editor can produce; drop everything else. */
export function sanitizeRichText(html: string): string {
	return sanitizeHtml(html, RICH_TEXT_OPTIONS);
}

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/**
 * Escape text destined for an HTML string that Svelte does not build — the
 * Leaflet popups being the only such place. Anywhere Svelte renders the value
 * itself, it already escapes.
 */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Rich text reduced to a single line of plain text, for previews and excerpts. */
export function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
