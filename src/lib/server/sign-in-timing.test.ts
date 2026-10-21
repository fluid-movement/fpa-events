// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { hashPassword, verifyPassword } from './password';
import { FAILED_SIGN_IN_FLOOR_MS, withFailedSignInTiming } from './sign-in-timing';

const clock = vi.hoisted(() => ({ now: 0, bcryptMs: 0, waits: [] as number[] }));
vi.mock('node:timers/promises', () => ({
	setTimeout: async (ms: number) => {
		clock.waits.push(ms);
		clock.now += ms;
	}
}));
vi.mock('better-auth/crypto', async (importOriginal) => ({
	...(await importOriginal<typeof import('better-auth/crypto')>()),
	hashPassword: async () => {
		clock.now += 58;
		return 'synthetic-scrypt';
	},
	verifyPassword: async () => {
		clock.now += 58;
		return false;
	}
}));
vi.mock('bcryptjs', () => ({
	default: {
		compare: async () => {
			clock.now += clock.bcryptMs;
			return false;
		}
	}
}));

function request(path = '/api/auth/sign-in/email', method = 'POST') {
	return new Request(`http://localhost:5173${path}`, {
		method,
		...(method === 'POST'
			? {
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ email: 'fixture@example.invalid', password: 'wrong-password' })
				}
			: {})
	});
}

beforeEach(() => {
	clock.now = 0;
	clock.waits = [];
	vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
});
afterEach(() => vi.restoreAllMocks());

describe('failed sign-in equalization through Better Auth', () => {
	const cases: {
		name: string;
		kind?: 'unknown' | 'no-account';
		hash?: string | null;
		cost?: number;
	}[] = [
		{ name: 'unknown email', kind: 'unknown' },
		{ name: 'no credential account', kind: 'no-account' },
		{ name: 'missing password', hash: null },
		{ name: 'scrypt', hash: 'synthetic-scrypt' },
		...['2a', '2b', '2y'].flatMap((variant) =>
			[4, 10, 12, 13, 14, 31].map((cost) => ({
				name: `${variant} cost ${cost}`,
				hash: `$${variant}$${String(cost).padStart(2, '0')}$${'a'.repeat(53)}`,
				cost
			}))
		)
	];

	it.each(cases)(
		'$name returns the same failure with bounded modeled padding',
		async ({ kind, hash, cost }) => {
			clock.bcryptMs = cost ? 70 * 2 ** (cost - 10) : 0;
			const user = {
				id: 'fixture-user',
				name: 'Synthetic',
				email: 'fixture@example.invalid',
				emailVerified: true,
				createdAt: new Date(),
				updatedAt: new Date()
			};
			const auth = betterAuth({
				baseURL: 'http://localhost:5173',
				secret: 'synthetic-test-secret-with-at-least-32-characters',
				database: memoryAdapter({
					user: kind === 'unknown' ? [] : [user],
					account: kind
						? []
						: [
								{
									id: 'fixture-account',
									userId: user.id,
									accountId: user.id,
									providerId: 'credential',
									password: hash
								}
							],
					session: [],
					verification: []
				}),
				emailAndPassword: {
					enabled: true,
					password: { hash: hashPassword, verify: verifyPassword }
				},
				logger: { disabled: true }
			});
			const req = request();
			const response = await withFailedSignInTiming(req, () => auth.handler(req));
			expect(response.status).toBe(401);
			expect(await response.json()).toEqual({
				code: 'INVALID_EMAIL_OR_PASSWORD',
				message: 'Invalid email or password'
			});
			const workMs = cost ? clock.bcryptMs : 58;
			expect(clock.now).toBe(Math.max(workMs, FAILED_SIGN_IN_FLOOR_MS));
			expect(clock.waits).toEqual(
				workMs < FAILED_SIGN_IN_FLOOR_MS ? [FAILED_SIGN_IN_FLOOR_MS - workMs] : []
			);
		}
	);
});

describe('bounded padding', () => {
	it.each([0, 58, 280, 560, 1000, 5000, 1e12])(
		'bounds the extra wait after %d ms of work',
		async (elapsed) => {
			const original = new Response('unchanged', {
				status: 401,
				headers: { 'x-fixture': 'preserved' }
			});
			const response = await withFailedSignInTiming(request(), async () => {
				clock.now += elapsed;
				return original;
			});
			expect(response).toBe(original);
			expect(clock.now).toBe(Math.max(elapsed, FAILED_SIGN_IN_FLOOR_MS));
			expect(clock.waits.reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(
				FAILED_SIGN_IN_FLOOR_MS
			);
		}
	);

	it('even a backwards clock cannot increase the fixed delay budget', async () => {
		await withFailedSignInTiming(request(), async () => {
			clock.now = -1e12;
			return new Response(null, { status: 401 });
		});
		expect(clock.waits).toEqual([FAILED_SIGN_IN_FLOOR_MS]);
	});

	it.each([200, 400, 403, 429, 500])(
		'leaves status %d unchanged without padding',
		async (status) => {
			const original = new Response(null, { status });
			expect(await withFailedSignInTiming(request(), async () => original)).toBe(original);
			expect(clock.waits).toEqual([]);
		}
	);

	it.each(['/api/auth/sign-in/email/', '/api/auth/sign-in/email?cost=999999&delay=999999'])(
		'covers %s without using attacker-supplied budgets',
		async (path) => {
			await withFailedSignInTiming(request(path), async () => new Response(null, { status: 401 }));
			expect(clock.waits).toEqual([FAILED_SIGN_IN_FLOOR_MS]);
		}
	);

	it.each([
		['/api/auth/sign-in/email', 'GET'],
		['/api/auth/change-password', 'POST'],
		['/settings/password', 'POST']
	])('does not pad unrelated endpoint %s %s', async (path, method) => {
		await withFailedSignInTiming(
			request(path, method),
			async () => new Response(null, { status: 401 })
		);
		expect(clock.waits).toEqual([]);
	});
});
