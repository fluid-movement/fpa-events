import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

const mockCreate = vi.fn().mockResolvedValue({});

vi.mock('mailgun.js', () => ({
	default: vi.fn(() => ({
		client: vi.fn(() => ({
			messages: { create: mockCreate }
		}))
	}))
}));

// Default env has no MAILGUN_API_KEY — uses console fallback
import { sendPasswordResetEmail, sendVerificationEmail } from './email';

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
