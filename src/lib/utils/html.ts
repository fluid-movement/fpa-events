import sanitizeHtml from 'sanitize-html';

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ['p', 'br', 'strong', 'em', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr'],
	allowedAttributes: {}
};

export function sanitizeRichText(html: string): string {
	return sanitizeHtml(html, RICH_TEXT_OPTIONS);
}
