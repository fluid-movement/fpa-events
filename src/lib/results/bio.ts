import type { PlayerBio, PlayerBioLink, PlayerBioSection } from './types';

/**
 * Turn fpa-api's `profile` enrichment into something the player page can
 * render without a second thought.
 *
 * The enrichment is historic data from the old FPA site, edited in
 * fpa-profiles; most players have none, and new keys can appear without an API
 * release. So nothing here is trusted: each field is kept only if it has one of
 * the three documented shapes (text, a list of names, a list of links), and
 * everything else is dropped silently. Returns `null` when nothing usable is
 * left, so the page has a single thing to check.
 *
 * `renderMarkdown` is passed in so this stays a pure function the tests can
 * run without a Markdown parser.
 */
export function toPlayerBio(
	raw: unknown,
	renderMarkdown: (md: string) => string
): PlayerBio | null {
	const fields = isRecord(raw) && isRecord(raw.fields) ? raw.fields : null;
	if (!fields) return null;

	const text = (key: string) => {
		const value = fields[key];
		return typeof value === 'string' && value.trim() ? value.trim() : null;
	};

	const bioMarkdown = text('bio');
	const bioHtml = bioMarkdown ? renderMarkdown(bioMarkdown).trim() || null : null;

	const sections: PlayerBioSection[] = [];
	let links: PlayerBioLink[] = [];

	const keys = [
		...SECTION_ORDER.filter((key) => key in fields),
		...Object.keys(fields).filter((key) => !SECTION_ORDER.includes(key) && !HEADER_KEYS.has(key))
	];

	for (const key of keys) {
		const value = fields[key];

		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (!trimmed) continue;
			const names = asNameList(trimmed);
			sections.push(
				names
					? { key, label: labelFor(key), kind: 'names', names }
					: { key, label: labelFor(key), kind: 'text', text: trimmed }
			);
			continue;
		}

		if (!Array.isArray(value) || value.length === 0) continue;

		if (value.every((item) => typeof item === 'string')) {
			const names = value.map((name) => name.trim()).filter(Boolean);
			if (names.length > 0) sections.push({ key, label: labelFor(key), kind: 'names', names });
			continue;
		}

		// Every list of objects is treated as links, wherever it appears, and
		// gathered into one row: a second `links`-shaped key upstream should
		// not render as an empty section.
		links = links.concat(value.map(toLink).filter((link) => link !== null));
	}

	const bio: PlayerBio = {
		nickname: text('nickname'),
		headline: text('headline'),
		playingSince: text('playingSince'),
		bioHtml,
		sections,
		links
	};

	const empty =
		!bio.nickname &&
		!bio.headline &&
		!bio.playingSince &&
		!bio.bioHtml &&
		sections.length === 0 &&
		links.length === 0;

	return empty ? null : bio;
}

/** Shown in the page header rather than as sections. */
const HEADER_KEYS = new Set(['nickname', 'headline', 'playingSince', 'bio']);

/**
 * The known story fields, in the order they read best. Unknown keys follow in
 * whatever order the API sent them.
 */
const SECTION_ORDER = [
	'careerHighlights',
	'howStarted',
	'favoriteMove',
	'mentors',
	'partners',
	'media',
	'sponsors',
	'hobbies',
	'links'
];

/** Labels as fpa-profiles words them; anything else is derived from the key. */
const LABELS: Record<string, string> = {
	careerHighlights: 'Career highlights',
	howStarted: 'How they started',
	favoriteMove: 'Favorite move',
	mentors: 'Mentors',
	partners: 'Partners',
	media: 'Media and appearances',
	sponsors: 'Sponsors',
	hobbies: 'Other interests'
};

/** `favoriteMove` → "Favorite move"; `top_3_moves` → "Top 3 moves". */
export function labelFor(key: string): string {
	if (LABELS[key]) return LABELS[key];
	const words = key
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
		.trim()
		.toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * fpa-profiles stores mentors, partners and sponsors as free text, and people
 * mostly wrote one name per line. Several short lines with no sentence
 * punctuation read better as names than as a tall column of text.
 */
function asNameList(text: string): string[] | null {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const nameLike = (line: string) => line.length <= 40 && !/[.!?:;]$/.test(line);
	return lines.length >= 2 && lines.every(nameLike) ? lines : null;
}

const LINK_KINDS = new Set(['website', 'sponsor', 'social', 'other']);

function toLink(item: unknown): PlayerBioLink | null {
	if (!isRecord(item) || typeof item.url !== 'string') return null;

	let url: URL;
	try {
		url = new URL(item.url.trim());
	} catch {
		return null;
	}
	// The page renders these as hrefs; anything but http(s) is a liability.
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

	const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : null;
	const kind = typeof item.kind === 'string' && LINK_KINDS.has(item.kind) ? item.kind : 'other';

	return {
		url: url.href,
		label: label ?? url.host.replace(/^www\./, ''),
		kind: kind as PlayerBioLink['kind']
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
