import { describe, expect, it } from 'vitest';
import { UploadLimiter, UPLOAD_LIMIT, UPLOAD_WINDOW_MS } from './upload-limit';

describe('upload admission', () => {
	it('allows the quota then refuses, without extending the window on refusal', () => {
		const limiter = new UploadLimiter();
		for (let n = 0; n < UPLOAD_LIMIT; n++) expect(limiter.consume('a', 0)).toBe(0);
		expect(limiter.consume('a', 1000)).toBe(3599);
		expect(limiter.consume('a', UPLOAD_WINDOW_MS - 1)).toBe(1);
		expect(limiter.consume('a', UPLOAD_WINDOW_MS)).toBe(0);
	});

	it('uses a sliding window rather than a calendar-hour burst reset', () => {
		const limiter = new UploadLimiter();
		limiter.consume('a', 0);
		for (let n = 1; n < UPLOAD_LIMIT; n++) limiter.consume('a', 1000);
		expect(limiter.consume('a', UPLOAD_WINDOW_MS)).toBe(0);
		expect(limiter.consume('a', UPLOAD_WINDOW_MS)).toBe(1);
		expect(limiter.consume('a', UPLOAD_WINDOW_MS + 1000)).toBe(0);
	});

	it('isolates users and caps concurrent admission', async () => {
		const limiter = new UploadLimiter();
		const results = await Promise.all(
			Array.from({ length: 40 }, async () => limiter.consume('a', 0))
		);
		expect(results.filter((retry) => retry === 0)).toHaveLength(UPLOAD_LIMIT);
		expect(limiter.consume('b', 0)).toBe(0);
	});

	it('fails closed at capacity and reclaims expired users without evicting live limits', () => {
		const limiter = new UploadLimiter(1);
		for (let n = 0; n < UPLOAD_LIMIT; n++) limiter.consume('a', 0);
		expect(limiter.consume('b', 0)).toBeGreaterThan(0);
		expect(limiter.consume('a', 0)).toBeGreaterThan(0);
		expect(limiter.consume('b', UPLOAD_WINDOW_MS)).toBe(0);
	});
});
