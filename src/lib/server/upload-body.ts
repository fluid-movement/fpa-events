import { error } from '@sveltejs/kit';

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
// Also limits chunked requests and multipart overhead, independently of the adapter.
export const MAX_UPLOAD_BODY_SIZE = 11 * 1024 * 1024;
export const UPLOAD_SIZE_ERROR = 'File too large (max 10MB)';

export async function readUploadBody(request: Request): Promise<FormData> {
	if (Number(request.headers.get('content-length')) > MAX_UPLOAD_BODY_SIZE) {
		error(413, UPLOAD_SIZE_ERROR);
	}
	let size = 0;
	const body = request.body?.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				size += chunk.byteLength;
				if (size > MAX_UPLOAD_BODY_SIZE) error(413, UPLOAD_SIZE_ERROR);
				controller.enqueue(chunk);
			}
		})
	);
	return new Response(body, { headers: request.headers }).formData();
}
