import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setEnv } from '../../test/mocks/app-env-private';

const runtime = vi.hoisted(() => ({ dev: false, building: false }));
vi.mock('$app/env', () => ({
	get dev() {
		return runtime.dev;
	},
	get building() {
		return runtime.building;
	},
	browser: false,
	version: 'test'
}));

const mockCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock('mailgun.js', () => ({
	default: class {
		client() {
			return { messages: { create: mockCreate } };
		}
	}
}));

import { assertProductionConfig, missingProductionKeys } from './production-config';
import { verifyTurnstile } from './turnstile';
import { sendPasswordResetEmail } from './email';

const BEARER = 'https://events.example/api/auth/reset-password?token=SECRET_BEARER_TOKEN';
const CONFIGURED = {
	TURNSTILE_SECRET_KEY: 'turnstile-secret',
	MAILGUN_API_KEY: 'mailgun-key',
	MAILGUN_DOMAIN: 'mg.example'
};
const BLANK = { TURNSTILE_SECRET_KEY: undefined, MAILGUN_API_KEY: undefined, MAILGUN_DOMAIN: '' };

beforeEach(() => {
	runtime.dev = false;
	runtime.building = false;
	setEnv(BLANK);
});

afterEach(() => {
	vi.restoreAllMocks();
	mockCreate.mockReset();
});

describe('missingProductionKeys', () => {
	it('names every unset or blank key, and only the key', () => {
		expect(
			missingProductionKeys({
				TURNSTILE_SECRET_KEY: '   ',
				MAILGUN_API_KEY: undefined,
				MAILGUN_DOMAIN: 'mg.example'
			})
		).toEqual(['TURNSTILE_SECRET_KEY', 'MAILGUN_API_KEY']);
	});
});

describe('assertProductionConfig', () => {
	it('refuses to start production without CAPTCHA and mail keys, naming keys only', () => {
		setEnv({ ...BLANK, MAILGUN_API_KEY: 'value-that-must-not-leak' });
		let message = '';
		try {
			assertProductionConfig();
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toContain('TURNSTILE_SECRET_KEY');
		expect(message).toContain('MAILGUN_DOMAIN');
		expect(message).not.toContain('MAILGUN_API_KEY');
		expect(message).not.toContain('value-that-must-not-leak');
	});

	it('passes when every key is configured', () => {
		setEnv(CONFIGURED);
		expect(() => assertProductionConfig()).not.toThrow();
	});

	it('keeps the blank-key fallbacks in dev and test', () => {
		runtime.dev = true;
		expect(() => assertProductionConfig()).not.toThrow();
	});

	it('needs no secrets to build', () => {
		runtime.building = true;
		expect(() => assertProductionConfig()).not.toThrow();
	});
});

describe('verifyTurnstile in production', () => {
	it('refuses instead of bypassing the check when the secret is missing', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile('any-token')).rejects.toThrow('TURNSTILE_SECRET_KEY');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses a missing token when configured', async () => {
		setEnv(CONFIGURED);
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile(undefined)).resolves.toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses a failed challenge when configured', async () => {
		setEnv(CONFIGURED);
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: false }))
		);
		await expect(verifyTurnstile('bad-token')).resolves.toBe(false);
	});
});

describe('sendEmail in production', () => {
	it('neither sends nor logs the bearer link when mail is not configured', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		sendPasswordResetEmail({ user: { email: 'user@test.com' }, url: BEARER });
		await vi.waitFor(() => expect(error).toHaveBeenCalled());

		const printed = [...log.mock.calls, ...error.mock.calls].flat().join(' ');
		expect(printed).not.toContain('SECRET_BEARER_TOKEN');
		expect(printed).not.toContain('user@test.com');
		expect(printed).toContain('MAILGUN_API_KEY');
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('delivers through the provider when configured', async () => {
		setEnv(CONFIGURED);
		vi.spyOn(console, 'log').mockImplementation(() => {});
		sendPasswordResetEmail({ user: { email: 'user@test.com' }, url: BEARER });
		await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledOnce());
		expect(mockCreate.mock.calls[0][0]).toBe('mg.example');
	});
});
