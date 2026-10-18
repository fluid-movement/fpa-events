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

/** Plain text for Svelte-rendered previews and excerpts; never inject as HTML. */
export function stripHtml(html: string): string {
	let needsSpace = false;
	const text = sanitizeHtml(html, {
		allowedTags: [],
		allowedAttributes: {},
		onOpenTag: () => {
			needsSpace = true;
		},
		onCloseTag: () => {
			needsSpace = true;
		},
		textFilter: (text) => {
			const prefix = needsSpace ? ' ' : '';
			needsSpace = false;
			return prefix + text;
		}
	});
	// The parser decodes named/numeric entities, then re-escapes these three in text.
	// Undo that once, after tag removal, so encoded markup remains literal text.
	const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' };
	return text
		.replace(/&(amp|lt|gt);/g, (entity) => entities[entity])
		.replace(/\s+/g, ' ')
		.trim();
}
