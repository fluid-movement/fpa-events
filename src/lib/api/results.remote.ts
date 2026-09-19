import * as v from 'valibot';
import { query } from '$app/server';
import { fpaApiGet, FpaApiError } from '#lib/server/fpa-api/client';
import {
	facetsOf,
	filterEvents,
	loadEventIndex,
	type IndexedEvent
} from '#lib/server/fpa-api/eventIndex';
import type { EventDetail } from '#lib/server/fpa-api/types';
import type { ApiResult } from '#lib/rankings/types';
import {
	PAGE_SIZE,
	type EventResultsView,
	type ResultEventRow,
	type ResultEventsView
} from '#lib/results/types';

/**
 * Results data, fetched from fpa-api server-side.
 *
 * Same two constraints as `rankings.remote.ts`:
 *  - every export from a `.remote.ts` must be a remote function, so shared
 *    types and constants live in `#lib/results/types`;
 *  - an error thrown here during SSR is not caught by `<svelte:boundary>` — the
 *    request 500s first — so an outage is returned as `ApiResult`, not thrown.
 */

/** Run a fetch, converting an expected API outage into a renderable result. */
async function attempt<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof FpaApiError) {
			console.warn(`[results] ${error.message}`);
			return { ok: false, message: error.message };
		}
		// Anything else is a genuine bug — let it surface.
		throw error;
	}
}

const toRow = (event: IndexedEvent): ResultEventRow => ({
	id: event.id,
	name: event.name,
	startDate: event.startDate,
	endDate: event.endDate,
	divisions: event.divisions,
	resultCount: event.resultCount
});

export const getResultEvents = query(
	v.optional(
		v.object({
			q: v.optional(v.string()),
			division: v.optional(v.string()),
			year: v.optional(v.pipe(v.number(), v.integer())),
			page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)))
		}),
		{}
	),
	async (args): Promise<ApiResult<ResultEventsView>> =>
		attempt(async () => {
			const index = await loadEventIndex();
			const matches = filterEvents(index, args);

			const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
			// Clamp rather than 404: a filter that narrows the list while `page` is
			// still in the URL is a normal thing to do, and bouncing to an error
			// there would be hostile.
			const page = Math.min(Math.max(args.page ?? 1, 1), pageCount);
			const start = (page - 1) * PAGE_SIZE;

			return {
				rows: matches.slice(start, start + PAGE_SIZE).map(toRow),
				total: matches.length,
				page,
				pageCount,
				// Facets come from the whole index, so narrowing to one division
				// never empties the division dropdown you narrowed with.
				facets: facetsOf(index)
			};
		})
);

export const getEventResults = query(
	v.string(),
	async (eventId): Promise<ApiResult<EventResultsView>> =>
		attempt(async () => {
			const detail = await fpaApiGet<EventDetail>(`/events/${encodeURIComponent(eventId)}`);

			return {
				id: detail.event.id,
				name: detail.event.name,
				startDate: detail.event.startDate,
				endDate: detail.event.endDate,
				// Left in the API's own order: it returns divisions grouped, and each
				// division's rounds final-first, which is the order worth reading.
				results: detail.results
			};
		})
);
