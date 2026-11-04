import { describe, expect, it } from 'vitest';
import {
	BODY_LANGUAGES,
	isBodyLanguage,
	primaryLanguage,
	shouldOfferTranslation
} from './translate';

describe('primaryLanguage', () => {
	it('normalizes case, whitespace and regional or script subtags', () => {
		expect(primaryLanguage(' EN-us ')).toBe('en');
		expect(primaryLanguage('zh-Hant-TW')).toBe('zh');
		expect(primaryLanguage('')).toBe('');
	});
});

describe('shouldOfferTranslation', () => {
	it('hides translation for the same language, including regional variants and case', () => {
		expect(shouldOfferTranslation('en', ['en'])).toBe(false);
		expect(shouldOfferTranslation('en-GB', ['EN-us'])).toBe(false);
	});
	it('offers translation into the preferred browser language', () => {
		expect(shouldOfferTranslation('de', ['en-US', 'de'])).toBe(true);
		expect(shouldOfferTranslation('de', ['de-DE', 'en'])).toBe(false);
	});
	it('hides translation when either language is absent', () => {
		expect(shouldOfferTranslation('de', [])).toBe(false);
		expect(shouldOfferTranslation('', ['en'])).toBe(false);
	});
});

describe('body language validation', () => {
	it('accepts every curated language tag', () => {
		for (const language of BODY_LANGUAGES) expect(isBodyLanguage(language)).toBe(true);
	});
	it('rejects unsupported, malformed, noncanonical and non-string values', () => {
		for (const value of ['', 'en-US', 'EN', 'xx', '<script>', null, 42]) {
			expect(isBodyLanguage(value)).toBe(false);
		}
	});
});
