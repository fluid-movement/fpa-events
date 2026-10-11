import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));
vi.mock('#lib/server/db', () => ({ db: { execute: executeMock } }));

import { GET } from './+server';

const check = () => GET({} as Parameters<typeof GET>[0]);

describe('/healthz', () => {
	beforeEach(() => {
		executeMock.mockReset();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('answers 200 when Postgres responds', async () => {
		executeMock.mockResolvedValue([]);
		const res = await check();
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
	});

	it('answers 503 when the query fails', async () => {
		executeMock.mockImplementation(() => Promise.reject(new Error('ECONNREFUSED')));
		expect((await check()).status).toBe(503);
	});

	it('answers 503 instead of hanging when Postgres never responds', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		executeMock.mockReturnValue(new Promise(() => {}));
		const pending = check();
		await vi.advanceTimersByTimeAsync(3000);
		expect((await pending).status).toBe(503);
	});

	it('does not leak the failure reason', async () => {
		executeMock.mockImplementation(() =>
			Promise.reject(new Error('password authentication failed for user "app"'))
		);
		expect(await (await check()).text()).toBe('unavailable');
	});
});
