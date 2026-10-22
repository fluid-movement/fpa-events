// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from './$types';

const uploadImage = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/r2', () => ({ uploadImage }));
import { POST } from './+server';

let userSequence = 0;

const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
	'base64'
);

function event(bytes: Uint8Array, type = 'image/png') {
	const body = new FormData();
	body.append('file', new Blob([new Uint8Array(bytes)], { type }), 'untrusted.html');
	return {
		request: new Request('https://events.test/api/events/upload-image', { method: 'POST', body }),
		locals: { user: { id: `uploader-${++userSequence}` } }
	} as RequestEvent & { request: Request };
}

beforeEach(() => {
	vi.clearAllMocks();
	uploadImage.mockResolvedValue({
		url: 'https://images.test/events/test.png',
		key: 'events/test.png'
	});
});

it.each([
	Buffer.from('<html>arbitrary hosting</html>'),
	Buffer.from('<svg onload="alert(1)"/>'),
	png.subarray(0, 8)
])('rejects a spoofed PNG before storage', async (bytes) => {
	const response = await POST(event(bytes));
	expect(response.status).toBe(400);
	expect(await response.json()).toEqual({
		error: 'Image contents do not match the declared format'
	});
	expect(uploadImage).not.toHaveBeenCalled();
});

it('rejects a valid raster whose declared format differs', async () => {
	const response = await POST(event(png, 'image/jpeg'));
	expect(response.status).toBe(400);
	expect(uploadImage).not.toHaveBeenCalled();
});

it('stores detected bytes and MIME independently of the filename', async () => {
	const response = await POST(event(png));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		url: 'https://images.test/events/test.png',
		key: 'events/test.png'
	});
	expect(uploadImage).toHaveBeenCalledWith(new Uint8Array(png), 'image/png');
});

it('returns JSON 413 when adapter-node rejects the body stream', async () => {
	const input = event(png);
	const adapterError = Object.assign(new Error('private adapter details'), { status: 413 });
	input.request = new Request(input.request.url, {
		method: 'POST',
		headers: input.request.headers,
		body: new ReadableStream({
			start(controller) {
				controller.error(adapterError);
			}
		}),
		duplex: 'half'
	} as RequestInit);
	const response = await POST(input);
	expect(response.status).toBe(413);
	expect(await response.json()).toEqual({ error: 'File too large (max 10MB)' });
	expect(uploadImage).not.toHaveBeenCalled();
});

it.each([10 * 1024 * 1024, 10 * 1024 * 1024 + 1])(
	'enforces the file boundary at %i bytes',
	async (size) => {
		const bytes = Buffer.alloc(size);
		png.copy(bytes);
		const response = await POST(event(bytes));
		if (size === 10 * 1024 * 1024) {
			expect(response.status).toBe(200);
		} else {
			expect(response.status).toBe(413);
			expect(await response.json()).toEqual({ error: 'File too large (max 10MB)' });
			expect(uploadImage).not.toHaveBeenCalled();
		}
	}
);

it('bounds streamed multipart bodies without Content-Length', async () => {
	const input = event(Buffer.alloc(11 * 1024 * 1024 + 1));
	// Incoming network streams do not use undici's outbound multipart generator.
	const bytes = new Uint8Array(await input.request.arrayBuffer());
	input.request = new Request(input.request.url, {
		method: 'POST',
		headers: input.request.headers,
		body: new ReadableStream({
			start(controller) {
				for (let offset = 0; offset < bytes.length; offset += 65536) {
					controller.enqueue(bytes.subarray(offset, offset + 65536));
				}
				controller.close();
			}
		}),
		duplex: 'half'
	} as RequestInit);
	expect(input.request.headers.has('content-length')).toBe(false);
	const response = await POST(input);
	expect(response.status).toBe(413);
	expect(await response.json()).toEqual({ error: 'File too large (max 10MB)' });
	expect(uploadImage).not.toHaveBeenCalled();
});

it('caps the streamed body even when the file itself is small', async () => {
	// Only the body cap can catch this: the file is a valid 1x1 PNG, the bulk
	// is a text field, so the 10 MB file-size check never fires.
	const body = new FormData();
	body.append('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'a.png');
	body.append('padding', 'x'.repeat(11 * 1024 * 1024 + 1));
	const encoded = new Request('https://events.test/', { method: 'POST', body });
	const bytes = new Uint8Array(await encoded.arrayBuffer());
	const input = event(png);
	input.request = new Request(input.request.url, {
		method: 'POST',
		headers: { 'content-type': encoded.headers.get('content-type')! },
		body: new ReadableStream({
			start(controller) {
				for (let offset = 0; offset < bytes.length; offset += 65536) {
					controller.enqueue(bytes.subarray(offset, offset + 65536));
				}
				controller.close();
			}
		}),
		duplex: 'half'
	} as RequestInit);
	expect(input.request.headers.has('content-length')).toBe(false);
	const response = await POST(input);
	expect(response.status).toBe(413);
	expect(uploadImage).not.toHaveBeenCalled();
});

it('refuses an oversized Content-Length before reading the body', async () => {
	const input = event(png);
	input.request.headers.set('content-length', String(11 * 1024 * 1024 + 1));
	const response = await POST(input);
	expect(response.status).toBe(413);
	expect(input.request.bodyUsed).toBe(false);
	expect(uploadImage).not.toHaveBeenCalled();
});

it('answers malformed multipart with safe JSON 400', async () => {
	const input = event(png);
	input.request = new Request(input.request.url, {
		method: 'POST',
		body: 'bad multipart',
		headers: { 'content-type': 'multipart/form-data' }
	});
	const response = await POST(input);
	expect(response.status).toBe(400);
	expect(await response.json()).toEqual({ error: 'Invalid upload form data' });
	expect(uploadImage).not.toHaveBeenCalled();
});

it('refuses request 21 before body parsing/storage and admits the same user after one hour', async () => {
	vi.useFakeTimers();
	try {
		const user = event(png).locals.user;
		const requestForUser = () => {
			const input = event(png);
			input.locals.user = user;
			return input;
		};
		const responses = await Promise.all(Array.from({ length: 20 }, () => POST(requestForUser())));
		expect(responses.map((response) => response.status)).toEqual(Array(20).fill(200));
		const blocked = requestForUser();
		const response = await POST(blocked);
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('3600');
		expect(await response.json()).toEqual({ error: 'Too many uploads. Try again later.' });
		expect(blocked.request.bodyUsed).toBe(false);
		expect(uploadImage).toHaveBeenCalledTimes(20);
		vi.advanceTimersByTime(60 * 60 * 1000);
		expect((await POST(requestForUser())).status).toBe(200);
		expect(uploadImage).toHaveBeenCalledTimes(21);
	} finally {
		vi.useRealTimers();
	}
});

it('still refuses an anonymous caller without reading or storing its image', async () => {
	const input = event(png);
	input.locals.user = undefined;
	const response = await POST(input);
	expect(response.status).toBe(401);
	expect(await response.json()).toEqual({ error: 'Unauthorized' });
	expect(input.request.bodyUsed).toBe(false);
	expect(uploadImage).not.toHaveBeenCalled();
});
