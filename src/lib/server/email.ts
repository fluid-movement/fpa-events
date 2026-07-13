import { env } from '$env/dynamic/private';
import Mailgun from 'mailgun.js';
import {
	APP_NAME,
	verificationTemplate,
	resetPasswordTemplate,
	getTemplate,
	type EmailTemplateId
} from '$lib/email/templates';

let _mgClient: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

function getClient() {
	if (!_mgClient && env.MAILGUN_API_KEY) {
		const mailgun = new Mailgun(FormData);
		_mgClient = mailgun.client({
			username: 'api',
			key: env.MAILGUN_API_KEY,
			url: 'https://api.eu.mailgun.net'
		});
	}
	return _mgClient;
}

export function sendDev({ to, subject, html }: { to: string; subject: string; html: string }) {
	console.log(`\n── Email ──────────────────────────────────`);
	console.log(`  To:      ${to}`);
	console.log(`  Subject: ${subject}`);

	const urlMatch = html.match(/https?:\/\/[^\s"'>]+/);
	if (urlMatch) {
		console.log(`  URL:     ${urlMatch[0]}`);
	}

	console.log(`──────────────────────────────────────────\n`);
}

export async function sendMailgun({
	to,
	subject,
	html
}: {
	to: string;
	subject: string;
	html: string;
}) {
	if (env.MAILGUN_API_KEY) {
		const client = getClient();
		if (!client) return;
		try {
			await client.messages.create(env.MAILGUN_DOMAIN!, {
				from: env.MAILGUN_FROM_EMAIL || `noreply@${env.MAILGUN_DOMAIN}`,
				to,
				subject,
				html
			});
			console.log(`[email] Sent "${subject}" to ${to}`);
		} catch (err) {
			console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
		}
	} else {
		sendDev({ to, subject, html });
	}
}

export async function sendEmail({
	to,
	subject,
	html
}: {
	to: string;
	subject: string;
	html: string;
}) {
	await sendMailgun({ to, subject, html });
}

export function sendPasswordResetEmail({ user, url }: { user: { email: string }; url: string }) {
	void sendEmail({
		to: user.email,
		subject: `Reset your ${APP_NAME} password`,
		html: resetPasswordTemplate(url)
	});
}

export function sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
	void sendEmail({
		to: user.email,
		subject: `Verify your ${APP_NAME} account`,
		html: verificationTemplate(url)
	});
}

export async function sendTestEmail({
	to,
	templateId
}: {
	to: string;
	templateId: EmailTemplateId;
}) {
	const tpl = getTemplate(templateId);
	if (!tpl) throw new Error('Unknown template');
	await sendEmail({ to, subject: `[TEST] ${tpl.subject}`, html: tpl.render() });
	return { ok: true };
}
