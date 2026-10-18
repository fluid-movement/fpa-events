import { formatDatesAtPlace } from '#lib/utils/dates';
import { stripHtml } from '#lib/utils/html';

export const SITE_NAME = 'FPA Events';
export const SITE_DESCRIPTION = 'Find freestyle events, see who is going and plan your season.';

/** Link previews cut off well before this; keep what we emit short and plain. */
const DESCRIPTION_LIMIT = 200;

export type PageMeta = {
	title: string;
	description: string;
	image?: { url: string; width?: number | null; height?: number | null };
};

export const DEFAULT_META: PageMeta = { title: SITE_NAME, description: SITE_DESCRIPTION };

/**
 * Plain-text preview: dates and place first, then as much of the rich-text
 * description as fits. Attribute escaping is Svelte's job when it renders the
 * tag; stripping markup is ours, so a preview never shows raw tags.
 */
export function eventMeta(event: {
	name: string;
	startDate: Date | string;
	endDate: Date | string;
	location: string;
	description: string | null;
	picture: string | null;
	pictureWidth: number | null;
	pictureHeight: number | null;
}): PageMeta {
	const summary = formatDatesAtPlace(event.startDate, event.endDate, event.location);
	const excerpt = event.description ? stripHtml(event.description) : '';
	let description = excerpt ? `${summary}. ${excerpt}` : summary;
	if (description.length > DESCRIPTION_LIMIT) {
		description = `${description.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
	}
	return {
		title: event.name,
		description,
		image: event.picture
			? { url: event.picture, width: event.pictureWidth, height: event.pictureHeight }
			: undefined
	};
}

/**
 * Route id prefixes whose path carries a credential (an invite token). The
 * canonical-URL tag is read by crawlers and search engines, so these routes
 * must not emit `og:url`. Query strings are never included in `og:url`.
 */
export const TOKEN_ROUTE_PREFIXES = ['/invite'] as const;

/** Whether a page may publish its URL as `og:url`. */
export function canEmitUrl(routeId: string | null): boolean {
	return !TOKEN_ROUTE_PREFIXES.some(
		(prefix) => routeId === prefix || routeId?.startsWith(`${prefix}/`)
	);
}
