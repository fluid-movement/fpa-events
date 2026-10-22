import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks so they're available inside vi.mock() factory (which is hoisted by Vitest)
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const MockPutObjectCommand = vi.hoisted(() => vi.fn());
const MockDeleteObjectCommand = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => ({
	// Must use regular function, not arrow, so it can be called with `new`
	S3Client: vi.fn(function () {
		return { send: mockSend };
	}),
	PutObjectCommand: MockPutObjectCommand,
	DeleteObjectCommand: MockDeleteObjectCommand
}));

// $app/env/private is aliased to src/test/mocks/app-env-private.ts by vite.config.ts

import { uploadImage, deleteImage } from './r2';

describe('uploadImage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSend.mockResolvedValue({});
	});

	it('sends a PutObjectCommand with correct bucket and content type', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';
		await uploadImage(bytes, type);

		expect(MockPutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				Bucket: 'test-bucket',
				ContentType: 'image/jpeg',
				CacheControl: 'public, max-age=31536000'
			})
		);
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it('returns a url that starts with the configured public base url', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';
		const result = await uploadImage(bytes, type);

		expect(result.url).toMatch(/^https:\/\/test\.r2\.dev\/events\//);
		expect(result.url).toBe(`https://test.r2.dev/${result.key}`);
	});

	it('normalises jpeg extension to jpg in the key', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';
		const result = await uploadImage(bytes, type);

		expect(result.key).toMatch(/\.jpg$/);
	});

	it('uses the correct extension for png', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/png';
		const result = await uploadImage(bytes, type);

		expect(result.key).toMatch(/\.png$/);
	});

	it('uses the correct extension for webp', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/webp';
		const result = await uploadImage(bytes, type);

		expect(result.key).toMatch(/\.webp$/);
	});

	it('places the file under the events/ prefix', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';
		const result = await uploadImage(bytes, type);

		expect(result.key).toMatch(/^events\//);
	});

	it('generates a unique key on each call', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';
		const [r1, r2] = await Promise.all([uploadImage(bytes, type), uploadImage(bytes, type)]);

		expect(r1.key).not.toBe(r2.key);
	});

	it('propagates S3 errors to the caller', async () => {
		mockSend.mockRejectedValueOnce(new Error('NoSuchBucket'));
		const bytes = new Uint8Array([1, 2, 3]);
		const type = 'image/jpeg';

		await expect(uploadImage(bytes, type)).rejects.toThrow('NoSuchBucket');
	});
});

describe('deleteImage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSend.mockResolvedValue({});
	});

	it('sends a DeleteObjectCommand with the correct key derived from the url', async () => {
		await deleteImage('https://test.r2.dev/events/abc123.jpg');

		expect(MockDeleteObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'events/abc123.jpg'
		});
		expect(mockSend).toHaveBeenCalledTimes(1);
	});

	it('handles nested paths correctly', async () => {
		await deleteImage('https://test.r2.dev/events/subfolder/img.png');

		expect(MockDeleteObjectCommand).toHaveBeenCalledWith({
			Bucket: 'test-bucket',
			Key: 'events/subfolder/img.png'
		});
	});

	it('propagates S3 errors to the caller', async () => {
		mockSend.mockRejectedValueOnce(new Error('AccessDenied'));

		await expect(deleteImage('https://test.r2.dev/events/abc.jpg')).rejects.toThrow('AccessDenied');
	});
});
