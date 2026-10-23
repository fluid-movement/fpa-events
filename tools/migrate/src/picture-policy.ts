// Keep in sync with the app's upload allowlist. The standalone tool must not
// import app code, and image/* would allow active SVG content.
export const ALLOWED_PICTURE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);

export function hasLegacyPicture(key: string | null): key is string {
	return Boolean(key?.trim());
}

export function legacyPictureUrl(publicUrl: string, key: string | null): string | null {
	if (!hasLegacyPicture(key)) return null;
	// Even percent-encoded standalone dots are normalized by browsers. There
	// is no single-decode URL path that preserves these object-key segments.
	const segments = key.split('/');
	if (segments.some((segment) => segment === '.' || segment === '..')) {
		throw new Error(`Picture key contains an unresolvable dot segment: ${JSON.stringify(key)}`);
	}
	const base = new URL(publicUrl);
	if (
		!['http:', 'https:'].includes(base.protocol) ||
		base.username ||
		base.password ||
		base.search ||
		base.hash
	) {
		throw new Error('Picture public URL must be http(s) without credentials, query or fragment');
	}
	return `${base.href.replace(/\/$/, '')}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}
