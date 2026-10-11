import { describe, it, expect } from 'vitest';
import { labelFor, toPlayerBio } from './bio';

const md = (text: string) => `<p>${text}</p>`;
const bio = (fields: unknown) => toPlayerBio({ fields, updatedAt: null }, md);

describe('toPlayerBio', () => {
	it('returns null when there is no profile, which is most players', () => {
		expect(toPlayerBio(null, md)).toBeNull();
		expect(toPlayerBio(undefined, md)).toBeNull();
		expect(toPlayerBio({ fields: null }, md)).toBeNull();
		expect(toPlayerBio('nonsense', md)).toBeNull();
	});

	it('returns null when every field is empty or malformed', () => {
		expect(
			bio({
				nickname: '  ',
				bio: '',
				mentors: [],
				links: [{ url: 'not a url' }],
				odd: 42,
				nested: { a: 1 }
			})
		).toBeNull();
	});

	it('lifts the header fields out of the sections', () => {
		const result = bio({ nickname: 'Alex', headline: 'Champion', playingSince: '2007' });
		expect(result).toMatchObject({ nickname: 'Alex', headline: 'Champion', playingSince: '2007' });
		expect(result?.sections).toEqual([]);
	});

	it('renders the bio through the Markdown renderer it is given', () => {
		expect(bio({ bio: 'Hi' })?.bioHtml).toBe('<p>Hi</p>');
	});

	it('orders known story fields and keeps line breaks in text', () => {
		const result = bio({
			howStarted: 'At a jam.\nThen hooked.',
			careerHighlights: 'Champion 2012'
		});
		expect(result?.sections).toEqual([
			{ key: 'careerHighlights', label: 'Career highlights', kind: 'text', text: 'Champion 2012' },
			{
				key: 'howStarted',
				label: 'How they started',
				kind: 'text',
				text: 'At a jam.\nThen hooked.'
			}
		]);
	});

	it('reads several short lines without punctuation as a list of names', () => {
		const result = bio({ mentors: 'Flo Hess\n\nHeiko Vogt\n', partners: 'Just one partner' });
		expect(result?.sections).toEqual([
			{ key: 'mentors', label: 'Mentors', kind: 'names', names: ['Flo Hess', 'Heiko Vogt'] },
			{ key: 'partners', label: 'Partners', kind: 'text', text: 'Just one partner' }
		]);
	});

	it('renders unknown keys by shape, after the known ones', () => {
		const result = bio({ teamNames: ['Jam Masters', ' '], hobbies: 'Cooking' });
		expect(result?.sections).toEqual([
			{ key: 'hobbies', label: 'Other interests', kind: 'text', text: 'Cooking' },
			{ key: 'teamNames', label: 'Team names', kind: 'names', names: ['Jam Masters'] }
		]);
	});

	it('keeps http(s) links only, labelled by host when unlabelled', () => {
		const result = bio({
			links: [
				{ kind: 'website', url: 'https://www.freestylefrisbee.de' },
				{ kind: 'sponsor', url: 'https://disc.example/x', label: 'Disc Co' },
				{ kind: 'social', url: 'javascript:alert(1)' },
				{ kind: 'mystery', url: 'http://example.org' },
				'https://string-not-object.example',
				null
			]
		});
		expect(result?.links).toEqual([
			{ url: 'https://www.freestylefrisbee.de/', label: 'freestylefrisbee.de', kind: 'website' },
			{ url: 'https://disc.example/x', label: 'Disc Co', kind: 'sponsor' },
			{ url: 'http://example.org/', label: 'example.org', kind: 'other' }
		]);
		expect(result?.sections).toEqual([]);
	});
});

describe('labelFor', () => {
	it('derives a sentence-case label from an unknown key', () => {
		expect(labelFor('topThreeMoves')).toBe('Top three moves');
		expect(labelFor('world_titles')).toBe('World titles');
	});
});
