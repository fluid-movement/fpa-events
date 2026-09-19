import { json } from '@sveltejs/kit';
import { uploadImage } from '#lib/server/r2';
import type { RequestHandler } from './$types';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!file.type.startsWith('image/')) {
		return json({ error: 'File must be an image' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large (max 10MB)' }, { status: 400 });
	}

	const result = await uploadImage(file);
	return json(result);
};
