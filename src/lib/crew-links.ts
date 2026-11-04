/** Display order and field names are shared by the admin form and public links. */
export const CREW_LINK_KINDS = [
	'website',
	'instagram',
	'facebook',
	'youtube',
	'tiktok',
	'discord',
	'whatsapp',
	'telegram',
	'other'
] as const;
export type CrewLinkKind = (typeof CREW_LINK_KINDS)[number];
export const CREW_LINK_LABELS: Record<CrewLinkKind, string> = {
	website: 'Website',
	instagram: 'Instagram',
	facebook: 'Facebook',
	youtube: 'YouTube',
	tiktok: 'TikTok',
	discord: 'Discord',
	whatsapp: 'WhatsApp',
	telegram: 'Telegram',
	other: 'Other link'
};
export const MAX_LINK_URL_LENGTH = 2048;

const BRAND_HOSTS: Partial<Record<CrewLinkKind, readonly string[]>> = {
	instagram: ['instagram.com'],
	facebook: ['facebook.com', 'fb.com'],
	youtube: ['youtube.com', 'youtu.be'],
	tiktok: ['tiktok.com'],
	discord: ['discord.gg', 'discord.com'],
	whatsapp: ['wa.me', 'whatsapp.com'],
	telegram: ['t.me', 'telegram.me', 'telegram.org']
};

/** Empty input clears a link. Reject schemes and credentials before rendering an href. */
export function normalizeLinkUrl(kind: CrewLinkKind, input: string): string {
	const value = input.trim();
	if (!value) return '';
	if (value.length > MAX_LINK_URL_LENGTH) throw new Error('Link must be at most 2048 characters.');
	if (
		!/^https:\/\//i.test(value) ||
		[...value].some(
			(char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\'
		)
	) {
		throw new Error('Enter a valid HTTPS URL.');
	}
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error('Enter a valid HTTPS URL.');
	}
	if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
		throw new Error('Enter a valid HTTPS URL.');
	}
	const hosts = BRAND_HOSTS[kind];
	if (hosts && !hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
		throw new Error(`Enter a ${CREW_LINK_LABELS[kind]} URL.`);
	}
	return value;
}
