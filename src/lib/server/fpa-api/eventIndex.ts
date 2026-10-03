import { fpaApiGet } from './client';
import { apiDateKey } from '#lib/utils/dates';
import type { EventSummary, PaginatedEvents } from './types';

/**
 * The event index: every upstream event that has results, held in memory and
 * filtered here rather than by the API.
 *
 * Two reasons we do not delegate to `GET /events`' own query parameters:
 *
 *  - Its `from`/`to` filter compares dates as strings, and 184 of the 914
 *    events carry a non-zero-padded date like `2020-2-8`. Asking for
 *    `from=2020-01-01&to=2020-12-31` drops that event, because `"2020-2-8"`
 *    sorts after `"2020-12-31"` lexically. A year filter built on it is
 *    quietly wrong, and the same comparison makes raw `startDate` strings
 *    unsafe to sort by.
 *  - There is no endpoint listing the divisions or years that exist, so the
 *    filter dropdowns need the whole index regardless.
 *
 * The whole index is ~244 KB over two requests, so it is cached for five
 * minutes. `#lib/api/rankings.remote.ts` argues against caching a single
 * ~150 ms call and that still holds; this is a different trade. The API
 * refreshes hourly, so a longer TTL would only add staleness on top of its own
 * (`fpa-api/docs/INTEGRATION.md`).
 */

/** The API's own ceiling on `limit`. */
const API_PAGE_SIZE = 500;

/** Guards against an unbounded loop if `total` ever disagrees with reality. */
const MAX_PAGES = 10;

const CACHE_TTL_MS = 5 * 60 * 1000;

/** An event with its date normalized once, at index time. */
export interface IndexedEvent extends EventSummary {
	/** Sortable `YYYY-MM-DD`, or null when the event has no usable date. */
	dateKey: string | null;
	/** Calendar year of `dateKey`, for the year facet. */
	year: number | null;
	/** Lowercased name, so filtering does not re-case 895 strings per keystroke. */
	searchName: string;
}

let cache: { events: IndexedEvent[]; loadedAt: number } | null = null;

/** In-flight load, shared so concurrent renders make one round trip, not five. */
let inFlight: Promise<IndexedEvent[]> | null = null;

function index(event: EventSummary): IndexedEvent {
	const dateKey = apiDateKey(event.startDate);
	return {
		...event,
		dateKey,
		year: dateKey ? Number(dateKey.slice(0, 4)) : null,
		searchName: event.name.toLowerCase()
	};
}

async function fetchAll(): Promise<IndexedEvent[]> {
	const events: IndexedEvent[] = [];
	// Counted separately from `events`: the filter below can drop some, and
	// paging on the kept count would keep asking for offsets that do not exist.
	let fetched = 0;

	for (let page = 0; page < MAX_PAGES; page++) {
		const offset = page * API_PAGE_SIZE;
		const batch = await fpaApiGet<PaginatedEvents>(
			`/events?hasResults=true&limit=${API_PAGE_SIZE}&offset=${offset}`
		);

		fetched += batch.items.length;

		// `hasResults=true` already asks for this, but the list is the entry point
		// to a results page: an event that reached us with nothing to show would
		// be a row that leads nowhere.
		for (const event of batch.items) {
			if (event.resultCount > 0) events.push(index(event));
		}

		if (fetched >= batch.total || batch.items.length === 0) break;
	}

	// Newest first, and only once — every later filter preserves this order.
	// Undated events sort last rather than to 1970.
	events.sort((a, b) => {
		if (a.dateKey === b.dateKey) return a.name.localeCompare(b.name);
		if (a.dateKey === null) return 1;
		if (b.dateKey === null) return -1;
		return b.dateKey.localeCompare(a.dateKey);
	});

	return events;
}

/**
 * The cached index, refreshing it when stale.
 *
 * A failed refresh throws and leaves the previous cache in place — callers
 * already degrade to an "unavailable" notice, and poisoning a good index
 * because one refresh timed out would turn a blip into an outage.
 */
export async function loadEventIndex(): Promise<IndexedEvent[]> {
	if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.events;

	inFlight ??= fetchAll()
		.then((events) => {
			cache = { events, loadedAt: Date.now() };
			return events;
		})
		.finally(() => {
			inFlight = null;
		});

	return inFlight;
}

/** Test seam. Not used by the app. */
export function resetEventIndexCache(): void {
	cache = null;
	inFlight = null;
}

export interface EventFacets {
	/** Years that have events, newest first. */
	years: number[];
	/** Divisions that have results, most common first. */
	divisions: string[];
}

export function facetsOf(events: IndexedEvent[]): EventFacets {
	const years = new Set<number>();
	const divisionCounts = new Map<string, number>();

	for (const event of events) {
		if (event.year !== null) years.add(event.year);
		for (const division of event.divisions) {
			divisionCounts.set(division, (divisionCounts.get(division) ?? 0) + 1);
		}
	}

	return {
		years: [...years].sort((a, b) => b - a),
		divisions: [...divisionCounts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([division]) => division)
	};
}

export interface EventFilter {
	q?: string;
	division?: string;
	year?: number;
}

/** Matching events, still newest first. Facets come from the unfiltered index. */
export function filterEvents(events: IndexedEvent[], filter: EventFilter): IndexedEvent[] {
	const needle = filter.q?.trim().toLowerCase();

	return events.filter((event) => {
		if (needle && !event.searchName.includes(needle)) return false;
		if (filter.division && !event.divisions.includes(filter.division)) return false;
		if (filter.year !== undefined && event.year !== filter.year) return false;
		return true;
	});
}
