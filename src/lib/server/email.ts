import { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL } from '$app/env/private';
import Mailgun from 'mailgun.js';
import { getTemplate, type EmailTemplateId } from '#lib/email/templates';

type Message = { to: string; subject: string; html: string };

let client: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

function getClient() {
	if (!client && MAILGUN_API_KEY) {
		client = new Mailgun(FormData).client({
			username: 'api',
			key: MAILGUN_API_KEY,
			url: 'https://api.eu.mailgun.net'
		});
	}
	return client;
}

/** Dev/test fallback: print the message, and the link in it, to the console. */
function logToConsole({ to, subject, html }: Message) {
	const url = html.match(/https?:\/\/[^\s"'>]+/)?.[0];

	console.log(`\n── Email ──────────────────────────────────`);
	console.log(`  To:      ${to}`);
	console.log(`  Subject: ${subject}`);
	if (url) console.log(`  URL:     ${url}`);
	console.log(`──────────────────────────────────────────\n`);
}

/**
 * Send a message, or log it when Mailgun is not configured — which is how local
 * dev and the integration suite read verification links without real delivery.
 *
 * Never throws: a failed send must not take down the sign-up or reset flow that
 * triggered it.
 */
export async function sendEmail(message: Message): Promise<void> {
	const mailgun = getClient();
	if (!mailgun) {
		logToConsole(message);
		return;
	}

	try {
		await mailgun.messages.create(MAILGUN_DOMAIN!, {
			from: MAILGUN_FROM_EMAIL || `noreply@${MAILGUN_DOMAIN}`,
			...message
		});
		console.log(`[email] Sent "${message.subject}" to ${message.to}`);
	} catch (err) {
		console.error(`[email] Failed to send "${message.subject}" to ${message.to}:`, err);
	}
}

/** Send one of the registered templates, rendered with a live URL. */
function sendTemplate(id: EmailTemplateId, to: string, url: string) {
	const template = getTemplate(id);
	// Fire-and-forget: Better Auth awaits its callbacks, and a slow Mailgun call
	// would otherwise stall the sign-up response.
	void sendEmail({ to, subject: template.subject, html: template.render(url) });
}

export function sendPasswordResetEmail({ user, url }: { user: { email: string }; url: string }) {
	sendTemplate('reset-password', user.email, url);
}

export function sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
	sendTemplate('activate-account', user.email, url);
}

/** Backs the dev-only email preview page. */
export async function sendTestEmail({
	to,
	templateId
}: {
	to: string;
	templateId: EmailTemplateId;
}) {
	const template = getTemplate(templateId);
	await sendEmail({ to, subject: `[TEST] ${template.subject}`, html: template.render() });
}
