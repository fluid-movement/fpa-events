import { describe, it, expect, vi, afterEach } from 'vitest';
import { attempt, UNAVAILABLE_MESSAGE } from './attempt';
import { FpaApiError } from './client';

afterEach(() => vi.restoreAllMocks());

describe('attempt', () => {
	it('tells the browser nothing about the upstream path, and logs it instead', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = await attempt('players', async () => {
			throw new FpaApiError('Rankings API returned 500 for /players/abc', 500);
		});

		expect(result).toEqual({ ok: false, message: UNAVAILABLE_MESSAGE });
		expect(JSON.stringify(result)).not.toContain('/players');
		expect(warn.mock.calls.flat().join(' ')).toContain('/players/abc');
	});

	it('lets a genuine bug surface', async () => {
		await expect(
			attempt('x', async () => {
				throw new TypeError('bug');
			})
		).rejects.toThrow(TypeError);
	});
});
