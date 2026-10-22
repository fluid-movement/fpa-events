// @vitest-environment node
/**
 * Lock-in for the authentication defenses that live in `auth.ts`'s own
 * configuration (issue 01M5A6S4EXZY5WE590R1XFP6GS, parent audit
 * 01M5A34XDWPGKSKMTVA213DHX7). The real `betterAuth` instance runs against an
 * in-memory adapter, a stubbed Cloudflare endpoint and a mocked Mailgun client:
 * no database, no network, no real mail.
 *
 * Reviewed against Better Auth 1.7.8. When it is updated, re-run this file and
 * the offline checks recorded in the issue: default limiter thresholds (sign-in,
 * sign-up, change-password 3/10s; reset and resend 3/60s) and /64 bucketing of
 * IPv6 clients. Not verifiable here and left to the deployment check: live
 * cookie issuance and renewal, production limiter thresholds, hostile
 * proxy-header handling, and whether the server really has a Turnstile secret.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'https://events.example.test';

// Better Auth switches its origin/CSRF check off whenever NODE_ENV is "test" or
// TEST is set, both of which Vitest does, so the defense would silently not be under test.
// "development" keeps the checks on without enabling the production-only
// rate limiter. Hoisted: the library reads it once, on import.
const { memdb, mailCreate } = vi.hoisted(() => {
	process.env.NODE_ENV = 'development';
	process.env.TEST = 'false';
	return {
		memdb: {
			user: [] as Record<string, unknown>[],
			session: [] as Record<string, unknown>[],
			account: [] as Record<string, unknown>[],
			verification: [] as Record<string, unknown>[]
		},
		mailCreate: vi.fn()
	};
});

vi.mock('$app/env/private', () => ({
	BETTER_AUTH_SECRET: 'config-test-secret-0123456789abcdef',
	BETTER_AUTH_URL: 'https://events.example.test',
	TURNSTILE_SECRET_KEY: 'synthetic-turnstile-secret',
	MAILGUN_API_KEY: 'synthetic-mailgun-key',
	MAILGUN_DOMAIN: 'mg.example.test',
	MAILGUN_FROM_EMAIL: undefined,
	GLITCHTIP_DSN: undefined
}));

vi.mock('better-auth/adapters/drizzle', async () => {
	const { memoryAdapter } = await import('better-auth/adapters/memory');
	return { drizzleAdapter: () => memoryAdapter(memdb) };
});

vi.mock('mailgun.js', () => ({
	default: class {
		client() {
			return { messages: { create: mailCreate } };
		}
	}
}));

let handler: (request: Request) => Promise<Response>;

beforeAll(async () => {
	const { auth } = await import('./auth');
	handler = auth.handler;
});

const turnstile = (success: boolean) =>
	vi.fn(async () => Response.json(success ? { success: true } : { success: false }));

beforeEach(() => {
	for (const table of Object.values(memdb)) table.length = 0;
	mailCreate.mockReset().mockResolvedValue({});
	vi.stubGlobal('fetch', turnstile(true));
});

afterEach(() => {
	vi.unstubAllGlobals();
});

type Options = { captcha?: string | null; headers?: Record<string, string> };

async function post(path: string, body: unknown, { captcha = 'ok', headers = {} }: Options = {}) {
	const response = await handler(
		new Request(`${ORIGIN}/api/auth${path}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				origin: ORIGIN,
				...(captcha === null ? {} : { 'x-captcha-response': captcha }),
				...headers
			},
			body: JSON.stringify(body)
		})
	);
	const text = await response.text();
	return { response, body: text ? JSON.parse(text) : null };
}

/** Mail is detached from the response, so let it settle before asserting on it. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const EMAIL = 'member@example.test';
const PASSWORD = 'correct-horse-battery-1';

/** A real sign-up, so the stored credential is what the app would have written. */
async function signUp(email = EMAIL, extra: Record<string, unknown> = {}) {
	const result = await post('/sign-up/email', {
		email,
		password: PASSWORD,
		name: 'Stored',
		...extra
	});
	await settle();
	mailCreate.mockClear();
	vi.mocked(fetch).mockClear();
	return result;
}

async function signUpVerified(email = EMAIL) {
	await signUp(email);
	for (const row of memdb.user) if (row.email === email) row.emailVerified = true;
}

const sideEffects = () => ({
	mail: mailCreate.mock.calls.length,
	users: memdb.user.length,
	sessions: memdb.session.length
});

const PROTECTED = [
	['/sign-up/email', () => ({ email: 'new@example.test', password: PASSWORD, name: 'New' })],
	['/sign-in/email', () => ({ email: EMAIL, password: PASSWORD })],
	['/request-password-reset', () => ({ email: EMAIL, redirectTo: '/reset-password' })],
	['/send-verification-email', () => ({ email: EMAIL })]
] as const;

describe('captcha coverage while a Turnstile secret is configured', () => {
	for (const [path, body] of PROTECTED) {
		it(`${path} refuses a request without a captcha token before any side effect`, async () => {
			await signUp();
			const before = sideEffects();
			const challenge = vi.mocked(fetch);

			const { response } = await post(path, body(), { captcha: null });
			await settle();

			expect(response.status).toBe(400);
			expect(sideEffects()).toEqual(before);
			expect(challenge).not.toHaveBeenCalled();
		});

		it(`${path} refuses a rejected challenge before any side effect`, async () => {
			await signUp();
			const before = sideEffects();
			vi.stubGlobal('fetch', turnstile(false));

			const { response } = await post(path, body(), { captcha: 'forged' });
			await settle();

			expect(response.status).toBe(403);
			expect(sideEffects()).toEqual(before);
		});
	}

	it('fails closed when Cloudflare cannot be reached', async () => {
		await signUp();
		const before = sideEffects();
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

		const { response } = await post('/sign-in/email', { email: EMAIL, password: PASSWORD });
		await settle();

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(sideEffects()).toEqual(before);
	});
});

describe('origin and callback checks', () => {
	const evil = 'https://evil.example.net/landing';

	it('refuses an off-site callback on each public endpoint before any side effect', async () => {
		await signUp();
		const before = sideEffects();

		const attempts = [
			post('/sign-in/email', { email: EMAIL, password: PASSWORD, callbackURL: evil }),
			post('/sign-up/email', {
				email: 'new@example.test',
				password: PASSWORD,
				name: 'New',
				callbackURL: evil
			}),
			post('/request-password-reset', { email: EMAIL, redirectTo: evil }),
			post('/send-verification-email', { email: EMAIL, callbackURL: evil })
		];
		for (const { response } of await Promise.all(attempts)) expect(response.status).toBe(403);
		await settle();

		expect(sideEffects()).toEqual(before);
	});

	it('refuses a cookie-bearing POST from a foreign Origin before writing the credential', async () => {
		await signUpVerified();
		const signedIn = await post('/sign-in/email', { email: EMAIL, password: PASSWORD });
		const cookie = signedIn.response.headers
			.getSetCookie()
			.map((c) => c.split(';')[0])
			.join('; ');
		expect(cookie).toContain('session_token');
		const hashBefore = memdb.account.map((row) => row.password);

		const { response } = await post(
			'/change-password',
			{ currentPassword: PASSWORD, newPassword: 'attacker-chosen-pw-9' },
			{ headers: { origin: 'https://evil.example.net', cookie } }
		);

		expect(response.status).toBe(403);
		expect(memdb.account.map((row) => row.password)).toEqual(hashBefore);
	});
});

describe('session cookie', () => {
	it('is issued Secure, HttpOnly, SameSite=Lax, host-scoped and valid for seven days', async () => {
		await signUpVerified();

		const { response } = await post('/sign-in/email', { email: EMAIL, password: PASSWORD });
		const cookies = response.headers.getSetCookie();
		const session = cookies.find((c) => c.includes('session_token'));

		expect(response.status).toBe(200);
		expect(session).toBeDefined();
		expect(session).toMatch(/^__Secure-better-auth\.session_token=/);
		expect(session).toMatch(/;\s*Secure/i);
		expect(session).toMatch(/;\s*HttpOnly/i);
		expect(session).toMatch(/;\s*SameSite=Lax/i);
		expect(session).toMatch(/;\s*Path=\//i);
		expect(session).not.toMatch(/;\s*Domain=/i);
		expect(session).toMatch(/;\s*Max-Age=604800(;|$)/i);
		// The stored session expires when the cookie does.
		const [stored] = memdb.session as { expiresAt: Date; createdAt: Date }[];
		expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(604800 * 1000);
	});
});

describe('verification gate', () => {
	it('signup input cannot make the account verified', async () => {
		const { response, body } = await signUp('sneaky@example.test', {
			emailVerified: true
		});

		expect(response.status).toBe(200);
		expect(body.token).toBeNull();
		expect(response.headers.getSetCookie()).toEqual([]);
		const [stored] = memdb.user;
		expect(stored.emailVerified).toBe(false);
		expect(memdb.session).toEqual([]);
	});

	it('a correct password does not open a session for an unverified account', async () => {
		await signUp();

		const { response, body } = await post('/sign-in/email', { email: EMAIL, password: PASSWORD });
		await settle();

		expect(response.status).toBe(403);
		expect(body.code).toBe('EMAIL_NOT_VERIFIED');
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(memdb.session).toEqual([]);
	});
});

describe('answers that must not reveal which accounts exist', () => {
	it('answers a wrong password and an unknown email identically', async () => {
		await signUpVerified();

		const wrong = await post('/sign-in/email', { email: EMAIL, password: 'wrong-password-1' });
		const unknown = await post('/sign-in/email', {
			email: 'nobody@example.test',
			password: 'wrong-password-1'
		});

		expect(wrong.response.status).toBe(401);
		expect(unknown.response.status).toBe(wrong.response.status);
		expect(unknown.body).toEqual(wrong.body);
		expect(unknown.response.headers.getSetCookie()).toEqual(wrong.response.headers.getSetCookie());
		expect(memdb.session).toEqual([]);
	});

	it('answers a reset request for a known and an unknown address identically', async () => {
		await signUpVerified();

		const known = await post('/request-password-reset', {
			email: EMAIL,
			redirectTo: '/reset-password'
		});
		const unknown = await post('/request-password-reset', {
			email: 'nobody@example.test',
			redirectTo: '/reset-password'
		});

		expect(known.response.status).toBe(200);
		expect(unknown.response.status).toBe(known.response.status);
		expect(unknown.body).toEqual(known.body);
	});

	it('answers a verification resend for a known and an unknown address identically', async () => {
		await signUp();

		const known = await post('/send-verification-email', { email: EMAIL });
		const unknown = await post('/send-verification-email', { email: 'nobody@example.test' });

		expect(known.response.status).toBe(200);
		expect(unknown.response.status).toBe(known.response.status);
		expect(unknown.body).toEqual(known.body);
	});

	it('answers a duplicate sign-up like a fresh one, without the stored account or a session', async () => {
		const first = await signUp(EMAIL, { name: 'Stored Name' });
		const stored = { ...memdb.user[0] };
		memdb.user[0].emailVerified = true;

		const duplicate = await post('/sign-up/email', {
			email: EMAIL,
			password: 'attacker-password-1',
			name: 'Attacker Name'
		});

		expect(duplicate.response.status).toBe(first.response.status);
		expect(Object.keys(duplicate.body).sort()).toEqual(Object.keys(first.body).sort());
		// `image` is a null column the in-memory adapter leaves out of a stored row.
		const fields = (user: object) =>
			Object.keys(user)
				.filter((key) => key !== 'image')
				.sort();
		expect(fields(duplicate.body.user)).toEqual(fields(first.body.user));
		expect(duplicate.body.token).toBeNull();
		expect(duplicate.response.headers.getSetCookie()).toEqual([]);
		// None of the stored account's data comes back.
		expect(duplicate.body.user.id).not.toBe(stored.id);
		expect(duplicate.body.user.name).toBe('Attacker Name');
		expect(duplicate.body.user.emailVerified).toBe(false);
		// And nothing was written: one account, no session, the old credential intact.
		expect(memdb.user).toHaveLength(1);
		expect(memdb.session).toEqual([]);
		const signedIn = await post('/sign-in/email', { email: EMAIL, password: PASSWORD });
		expect(signedIn.response.status).toBe(200);
	});

	it('still answers a reset request when the mail provider rejects', async () => {
		await signUpVerified();
		mailCreate.mockRejectedValue(new Error('mailgun 500'));
		const printed = vi.spyOn(console, 'error').mockImplementation(() => {});

		const { response, body } = await post('/request-password-reset', {
			email: EMAIL,
			redirectTo: '/reset-password'
		});
		await settle();

		expect(response.status).toBe(200);
		expect(body).toEqual({ status: true, message: expect.any(String) });
		expect(mailCreate).toHaveBeenCalledOnce();
		expect(printed).toHaveBeenCalled();
		printed.mockRestore();
	});
});
