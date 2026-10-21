import { json } from '@sveltejs/kit';
import { uploadImage } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Raster formats only. `image/*` would admit SVG, which can carry script and is
 * served from our bucket's public URL.
 */
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Invalid multipart body' }, { status: 400 });
	}
	const file = formData.get('file');

	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return json({ error: 'File must be a JPEG, PNG, WebP, GIF or AVIF image' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large (max 10MB)' }, { status: 400 });
	}

	const result = await uploadImage(file);
	return json(result);
};
