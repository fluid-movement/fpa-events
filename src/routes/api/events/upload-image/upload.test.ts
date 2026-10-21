import { describe, expect, it, vi } from 'vitest';
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('#lib/server/r2', () => ({ uploadImage: upload }));
import { POST } from './+server';

// The handler reads only these two request-event properties.
function event(request: Request) {
	return { request, locals: { user: { id: 'test-user' } } } as unknown as Parameters<
		typeof POST
	>[0];
}

describe('upload malformed multipart', () => {
	it('returns safe JSON 400 when formData throws', async () => {
		const request = new Request('https://example.org/api/events/upload-image', {
			method: 'POST',
			headers: { 'content-type': 'multipart/form-data; boundary=missing' },
			body: 'broken'
		});
		const response = await POST(event(request));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Invalid multipart body' });
		expect(upload).not.toHaveBeenCalled();
	});
	it('keeps genuine storage failures as server errors', async () => {
		const request = new Request('https://example.org/api/events/upload-image', { method: 'POST' });
		const data = new FormData();
		data.set('file', new File(['png'], 'picture.png', { type: 'image/png' }));
		vi.spyOn(request, 'formData').mockResolvedValue(data);
		const fault = new Error('storage unavailable');
		upload.mockRejectedValueOnce(fault);
		await expect(POST(event(request))).rejects.toBe(fault);
	});
});
