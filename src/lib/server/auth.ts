import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha } from 'better-auth/plugins';
import { db } from '#lib/server/db';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL, TURNSTILE_SECRET_KEY } from '$app/env/private';
import { sendPasswordResetEmail, sendVerificationEmail } from './email';
import { hashPassword, verifyPassword } from './password';

// Only guard endpoints with Turnstile when a secret key is configured; otherwise
// leave captcha off so local dev and tests work without keys (mirrors the Mailgun
// console fallback in ./email.ts).
const plugins = TURNSTILE_SECRET_KEY
	? [
			captcha({
				provider: 'cloudflare-turnstile',
				secretKey: TURNSTILE_SECRET_KEY,
				endpoints: [
					'/sign-up/email',
					'/sign-in/email',
					'/request-password-reset',
					'/send-verification-email'
				]
			})
		]
	: [];

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		// Custom verify so bcrypt hashes migrated from the legacy Laravel app
		// keep working alongside Better Auth's default scrypt hashes.
		password: { hash: hashPassword, verify: verifyPassword },
		sendResetPassword: async ({ user, url }) => {
			void sendPasswordResetEmail({ user, url });
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			void sendVerificationEmail({ user, url });
		}
	},
	secret: BETTER_AUTH_SECRET,
	baseURL: BETTER_AUTH_URL,
	plugins
});
