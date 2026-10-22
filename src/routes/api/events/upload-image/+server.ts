import { json } from '@sveltejs/kit';
import { uploadImage } from '#lib/server/r2';
import { detectImageType } from '#lib/server/image-type';
import { MAX_IMAGE_SIZE, readUploadBody, UPLOAD_SIZE_ERROR } from '#lib/server/upload-body';
import { uploadLimiter } from '#lib/server/upload-limit';
import type { RequestHandler } from './$types';

/**
 * Raster formats only. `image/*` would admit SVG, which can carry script and is
 * served from our bucket's public URL.
 */
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const retryAfter = uploadLimiter.consume(locals.user.id);
	if (retryAfter) {
		return json(
			{ error: 'Too many uploads. Try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(retryAfter) }
			}
		);
	}

	let formData: FormData;
	try {
		formData = await readUploadBody(request);
	} catch (cause) {
		// adapter-node uses SvelteKitError, not HttpError, for its body limit.
		const tooLarge =
			typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 413;
		return json(
			{ error: tooLarge ? UPLOAD_SIZE_ERROR : 'Invalid upload form data' },
			{ status: tooLarge ? 413 : 400 }
		);
	}
	const file = formData.get('file');

	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return json({ error: 'File must be a JPEG, PNG, WebP, GIF or AVIF image' }, { status: 400 });
	}

	if (file.size > MAX_IMAGE_SIZE) {
		return json({ error: UPLOAD_SIZE_ERROR }, { status: 413 });
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const type = detectImageType(bytes);
	if (!type || type !== file.type) {
		return json({ error: 'Image contents do not match the declared format' }, { status: 400 });
	}

	const result = await uploadImage(bytes, type);
	return json(result);
};
