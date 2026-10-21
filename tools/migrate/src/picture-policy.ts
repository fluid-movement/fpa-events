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
	return hasLegacyPicture(key) ? `${publicUrl}/${key}` : null;
}
