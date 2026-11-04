/** The language tags offered by the crew editor and accepted by the server. */
export const BODY_LANGUAGES = [
	'ar',
	'bg',
	'bn',
	'cs',
	'da',
	'de',
	'el',
	'en',
	'es',
	'fi',
	'fr',
	'he',
	'hi',
	'hr',
	'hu',
	'id',
	'it',
	'ja',
	'ko',
	'nl',
	'no',
	'pl',
	'pt',
	'ro',
	'ru',
	'sv',
	'tr',
	'uk',
	'vi',
	'zh'
] as const;

export type BodyLanguage = (typeof BODY_LANGUAGES)[number];

export const bodyLanguageOptions = BODY_LANGUAGES.map((value) => ({
	value,
	label: new Intl.DisplayNames(['en'], { type: 'language' }).of(value) ?? value
})).sort((a, b) => a.label.localeCompare(b.label, 'en'));

export function isBodyLanguage(value: unknown): value is BodyLanguage {
	return typeof value === 'string' && BODY_LANGUAGES.some((language) => language === value);
}

export function primaryLanguage(tag: string): string {
	return tag.trim().toLowerCase().split('-')[0];
}

/** The first browser language is the preferred translation target. */
export function shouldOfferTranslation(
	declared: string,
	browserLanguages: readonly string[]
): boolean {
	const source = primaryLanguage(declared);
	const target = primaryLanguage(browserLanguages[0] ?? '');
	return Boolean(source && target && source !== target);
}
