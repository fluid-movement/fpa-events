// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import type { Handle } from '@sveltejs/kit/hooks';

vi.mock('#lib/server/auth', () => ({ auth: { api: { getSession: async () => null } } }));
vi.mock('#lib/server/db', () => ({ db: {} }));
vi.mock('$app/env', () => ({ building: false }));
vi.mock('@sentry/sveltekit', () => ({ init: vi.fn() }));
vi.mock('node:timers/promises', () => ({
	setTimeout: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
}));
vi.mock('better-auth/svelte-kit', () => ({
	svelteKitHandler: async () => new Response('invalid credentials', { status: 401 })
}));

import { handle } from './hooks.server';
import { FAILED_SIGN_IN_FLOOR_MS } from './lib/server/sign-in-timing';

afterEach(() => vi.useRealTimers());

it('does not release a failed HTTP sign-in response until its independent delay expires', async () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] });
	const input = {
		event: {
			request: new Request('http://localhost:5173/api/auth/sign-in/email', { method: 'POST' }),
			locals: {}
		},
		resolve: vi.fn()
	} as unknown as Parameters<Handle>[0];
	const finished: number[] = [];
	const first = Promise.resolve(handle(input)).then((response) => {
		finished.push(1);
		return response;
	});
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(200);
	const second = Promise.resolve(handle(input)).then((response) => {
		finished.push(2);
		return response;
	});
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(FAILED_SIGN_IN_FLOOR_MS - 201);
	expect(finished).toEqual([]);
	await vi.advanceTimersByTimeAsync(1);
	expect(finished).toEqual([1]);
	await vi.advanceTimersByTimeAsync(200);
	expect(finished).toEqual([1, 2]);
	for (const response of await Promise.all([first, second])) {
		expect(response.status).toBe(401);
		expect(await response.text()).toBe('invalid credentials');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
	}
});
