import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('mailgun.js', () => ({
	default: class {
		client() {
			return { messages: { create: mockCreate } };
		}
	}
}));

// Default env has no MAILGUN_API_KEY — uses console fallback
import { setEnv } from '../../test/mocks/app-env-private';
import { sendEmail, sendPasswordResetEmail, sendVerificationEmail } from './email';
import { getTemplate } from '#lib/email/templates';

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

// Better Auth awaits `sendResetPassword` and `sendVerificationEmail`, and answers
// the same way whether or not an address exists. A provider failure that reached
// the response (or escaped as an unhandled rejection) would tell a caller which
// addresses have accounts, or take the flow down.
describe('when the mail provider rejects', () => {
	const unhandled = vi.fn();

	beforeEach(() => {
		setEnv({ MAILGUN_API_KEY: 'synthetic-key', MAILGUN_DOMAIN: 'mg.example.test' });
		mockCreate.mockReset().mockRejectedValue(new Error('mailgun 503'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'log').mockImplementation(() => {});
		process.on('unhandledRejection', unhandled);
	});

	afterEach(() => {
		process.off('unhandledRejection', unhandled);
		unhandled.mockReset();
		setEnv({ MAILGUN_API_KEY: undefined, MAILGUN_DOMAIN: undefined });
		vi.restoreAllMocks();
	});

	/** Long enough for a rejected promise to be reported as unhandled. */
	const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

	it.each([
		['reset', sendPasswordResetEmail],
		['verification', sendVerificationEmail]
	])('the %s callback returns at once and swallows the failure', (_name, send) => {
		const url = 'https://events.example.test/api/auth/verify-email?token=abc';
		// Never settles: the callback must not wait for the provider at all.
		mockCreate.mockReturnValue(new Promise(() => {}));

		const result = send({ user: { email: 'user@test.com' }, url });

		expect(result).toBeUndefined();
		expect(mockCreate).toHaveBeenCalledOnce();
	});

	it.each([
		['reset', sendPasswordResetEmail],
		['verification', sendVerificationEmail]
	])('the %s callback logs a rejected send without an unhandled rejection', async (_name, send) => {
		send({ user: { email: 'user@test.com' }, url: 'https://events.example.test/x?token=abc' });
		await flush();

		expect(mockCreate).toHaveBeenCalledOnce();
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('[email] Failed to send'),
			expect.any(Error)
		);
		expect(unhandled).not.toHaveBeenCalled();
	});

	it('sendEmail resolves rather than throws', async () => {
		await expect(
			sendEmail({ to: 'user@test.com', subject: 'Hi', html: '<p>hi</p>' })
		).resolves.toBeUndefined();
		expect(mockCreate).toHaveBeenCalledOnce();
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
