export const APP_NAME = 'FPA Events';

export function baseTemplate(title: string, body: string) {
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" style="width:100%;max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="padding:32px 24px 0;text-align:center">
<h1 style="font-size:20px;margin:0 0 4px;color:#18181b">${APP_NAME}</h1>
</td></tr>
<tr><td style="padding:16px 24px">
<h2 style="font-size:16px;margin:0 0 12px;color:#18181b">${title}</h2>
${body}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#a1a1aa;text-align:center">
<p style="margin:0">If you didn't request this email, you can safely ignore it.</p>
</td></tr>
</table>
</body>
</html>`;
}

export function resetPasswordTemplate(url: string) {
	return baseTemplate(
		'Reset your password',
		`<p style="margin:0 0 16px;color:#52525b;font-size:14px;line-height:1.5">
Click the button below to reset your password. This link expires in 1 hour.
</p>
<table role="presentation" style="margin:0 auto 16px"><tr><td style="background:#18181b;border-radius:6px;padding:12px 24px">
<a href="${url}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Reset Password</a>
</td></tr></table>
<p style="margin:0;color:#52525b;font-size:13px;word-break:break-all">${url}</p>`
	);
}

export function verificationTemplate(url: string) {
	return baseTemplate(
		'Verify your email',
		`<p style="margin:0 0 16px;color:#52525b;font-size:14px;line-height:1.5">
Thanks for signing up! Click the button below to activate your account. This link expires in 1 hour.
</p>
<table role="presentation" style="margin:0 auto 16px"><tr><td style="background:#18181b;border-radius:6px;padding:12px 24px">
<a href="${url}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">Activate Account</a>
</td></tr></table>
<p style="margin:0;color:#52525b;font-size:13px;word-break:break-all">${url}</p>`
	);
}

export type EmailTemplateId = 'activate-account' | 'reset-password';

export interface EmailTemplate {
	id: EmailTemplateId;
	name: string;
	subject: string;
	sampleUrl: string;
	render: (url?: string) => string;
}

const SAMPLE_VERIFICATION_URL =
	'https://example.com/verify-email?token=sample-verification-token-abc123';
const SAMPLE_RESET_URL = 'https://example.com/reset-password?token=sample-reset-token-xyz789';

export const emailTemplates: EmailTemplate[] = [
	{
		id: 'activate-account',
		name: 'Activate Account',
		subject: `Verify your ${APP_NAME} account`,
		sampleUrl: SAMPLE_VERIFICATION_URL,
		render: (url) => verificationTemplate(url ?? SAMPLE_VERIFICATION_URL)
	},
	{
		id: 'reset-password',
		name: 'Reset Password',
		subject: `Reset your ${APP_NAME} password`,
		sampleUrl: SAMPLE_RESET_URL,
		render: (url) => resetPasswordTemplate(url ?? SAMPLE_RESET_URL)
	}
];

export function getTemplate(id: EmailTemplateId): EmailTemplate | undefined {
	return emailTemplates.find((t) => t.id === id);
}
