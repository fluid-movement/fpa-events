import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn().mockResolvedValue({}));

// `email.ts` calls `new Mailgun(...)`, so the stand-in has to be constructible:
// a `function`, not an arrow.
vi.mock('mailgun.js', () => ({
	default: vi.fn(function () {
		return { client: vi.fn(() => ({ messages: { create: mockCreate } })) };
	})
}));

// Default env has no MAILGUN_API_KEY — uses console fallback
import { sendPasswordResetEmail, sendVerificationEmail } from './email';
import { getTemplate } from '#lib/email/templates';
import { setEnv } from '../../test/mocks/app-env-private';

describe('sendPasswordResetEmail', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs the reset URL to console when Mailgun is not configured', () => {
		const url = 'http://localhost:5173/api/auth/reset-password?token=abc123';
		sendPasswordResetEmail({ user: { email: 'user@test.com' }, url });

		const log = (console.log as ReturnType<typeof vi.spyOn>).mock;
		const calls = log.calls.flat().join(' ');
		expect(calls).toContain('user@test.com');
		expect(calls).toContain('Reset your FPA Events password');
		expect(calls).toContain(url);
	});
});

describe('sendVerificationEmail', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('logs the verification URL to console when Mailgun is not configured', () => {
		const url = 'http://localhost:5173/api/auth/verify-email?token=abc123';
		sendVerificationEmail({ user: { email: 'user@test.com' }, url });

		const log = (console.log as ReturnType<typeof vi.spyOn>).mock;
		const calls = log.calls.flat().join(' ');
		expect(calls).toContain('user@test.com');
		expect(calls).toContain('Verify your FPA Events account');
		expect(calls).toContain(url);
	});
});

// Better Auth hands these callbacks the whole user row, name included. The
// messages must be built from the URL alone, so a name (or anything else the
// user typed) can never be injected into a mail the app sends on its behalf.
describe('auth messages carry only the URL', () => {
	const markupName = '<a href="https://evil.example">Click me</a><img src=x onerror=alert(1)>';
	const user = {
		id: 'user-1',
		email: 'user@test.com',
		name: markupName,
		image: '<script>alert(1)</script>'
	};

	beforeEach(() => {
		mockCreate.mockClear();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		setEnv({ MAILGUN_API_KEY: 'test-key', MAILGUN_DOMAIN: 'mg.test' });
	});

	afterEach(() => {
		setEnv({ MAILGUN_API_KEY: undefined, MAILGUN_DOMAIN: undefined });
		vi.restoreAllMocks();
	});

	for (const [label, send, templateId, url] of [
		[
			'verification',
			sendVerificationEmail,
			'activate-account',
			'https://events.test/api/auth/verify-email?token=t1&callbackURL=%2F'
		],
		[
			'password reset',
			sendPasswordResetEmail,
			'reset-password',
			'https://events.test/reset-password/t2?callbackURL=%2Fsign-in'
		]
	] as const) {
		it(`the ${label} message is the fixed template plus the URL, and nothing of the user`, async () => {
			send({ user, url });
			await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));

			const [, message] = mockCreate.mock.calls[0];
			const template = getTemplate(templateId);
			expect(message.to).toBe(user.email);
			expect(message.subject).toBe(template.subject);
			expect(message.html).toBe(template.render(url));
			for (const field of [message.subject, message.html]) {
				expect(field).not.toContain(markupName);
				expect(field).not.toContain('evil.example');
				expect(field).not.toContain('onerror');
				expect(field).not.toContain('<script>');
			}
		});
	}
});
