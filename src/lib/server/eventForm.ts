import { calendarDate, pictureDimension, text } from '#lib/server/validation';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { R2_PUBLIC_URL } from '$app/env/private';
import { events, crews } from '#lib/server/db/schema';
import { findOrCreateCity } from '#lib/server/db/cities';
import { deleteImage, uploadedImageExists } from '#lib/server/r2';
import { withPictureLock, type PictureTransaction } from '#lib/server/picture-storage';

/**
 * The event form, shared by create and edit — they post the same fields, and
 * had drifted into two identical copies of this schema.
 *
 * Everything arrives as a string because it comes from `FormData`; the city
 * fields are filled in by `EventLocationInput` only when a geocoding suggestion
 * was picked, so they are all optional and only honoured as a complete set.
 */
/**
 * A geocoder coordinate as `EventLocationInput` posts it: blank (no pick) or a
 * plain finite decimal within `limit`. `parseFloat` alone accepts `NaN`,
 * `Infinity` and `1e999`, all of which Postgres `real` stores and Leaflet
 * then throws on.
 */
const coordinate = (limit: number) =>
	v.optional(
		v.pipe(
			text,
			v.check(
				(value) =>
					value === '' ||
					(/^-?\d+(\.\d+)?$/.test(value) &&
						Number.isFinite(Number(value)) &&
						Math.abs(Number(value)) <= limit),
				'Invalid coordinates.'
			)
		)
	);

export const eventFormSchema = v.pipe(
	v.object({
		name: v.pipe(text, v.minLength(1), v.maxLength(100)),
		description: text,
		startDate: calendarDate,
		endDate: calendarDate,
		location: text,
		city: v.optional(v.pipe(text, v.maxLength(100))),
		country: v.optional(v.pipe(text, v.maxLength(100))),
		latitude: coordinate(90),
		longitude: coordinate(180),
		// Unchecked checkboxes are omitted; the UI seeds this checked on create.
		showCrew: v.optional(v.boolean(), false),
		picture: v.optional(text),
		pictureWidth: pictureDimension,
		pictureHeight: pictureDimension,
		turnstileToken: v.optional(text)
	}),
	// `yyyy-mm-dd` strings compare correctly as text. Same-day events are fine.
	v.forward(
		v.partialCheck(
			[['startDate'], ['endDate']],
			({ startDate, endDate }) => endDate >= startDate,
			'The event cannot end before it starts.'
		),
		['endDate']
	)
);

export type EventFormData = v.InferOutput<typeof eventFormSchema>;

type PictureColumns = {
	picture: string | null;
	pictureWidth: number | null;
	pictureHeight: number | null;
};

/** Whether `url` is an object the upload endpoint put in our bucket. */
export function isUploadedPictureUrl(url: string, publicUrl = R2_PUBLIC_URL): boolean {
	if (!publicUrl) return false;
	const prefix = `${publicUrl.replace(/\/+$/, '')}/events/`;
	return url.startsWith(prefix) && !url.slice(prefix.length).includes('/');
}

/** Count both kinds of owner, excluding only the specified owner and kind. */
export async function pictureUsedElsewhere(
	url: string,
	eventId: string | null,
	tx: PictureTransaction,
	kind: 'event' | 'crew' = 'event'
): Promise<boolean> {
	const [row] = await tx
		.select({ id: events.id })
		.from(events)
		.where(
			eventId && kind === 'event'
				? and(eq(events.picture, url), ne(events.id, eventId))
				: eq(events.picture, url)
		)
		.limit(1);
	if (row) return true;
	const [crew] = await tx
		.select({ id: crews.id })
		.from(crews)
		.where(
			eventId && kind === 'crew'
				? and(eq(crews.picture, url), ne(crews.id, eventId))
				: eq(crews.picture, url)
		)
		.limit(1);
	return !!crew;
}

/**
 * The three picture columns, keeping `current` when omitted and clearing it for an explicit empty URL.
 *
 * The picture URL comes from a hidden form field, so it is checked here: a new
 * value must be a fresh upload into our bucket that no other event or crew uses.
 * Otherwise an organizer could adopt another event's image and then, by
 * replacing it, have the server delete it (see `releasePicture`). An event's
 * existing value — including legacy `/pictures/` URLs from the migration — is
 * always allowed to stay.
 */
export async function parsePictureFields(
	data: Pick<EventFormData, 'picture' | 'pictureWidth' | 'pictureHeight'>,
	current: PictureColumns,
	eventId: string | null,
	tx: PictureTransaction,
	kind: 'event' | 'crew' = 'event'
): Promise<PictureColumns> {
	const picture = data.picture === undefined ? current.picture : data.picture || null;
	if (picture && picture !== current.picture) {
		if (
			!isUploadedPictureUrl(picture) ||
			(await pictureUsedElsewhere(picture, eventId, tx, kind))
		) {
			error(400, 'Invalid picture');
		}
		// The caller holds the picture lock through the event write. If cleanup
		// already removed an abandoned upload, its stale URL cannot be attached.
		if (!(await uploadedImageExists(picture))) error(400, 'Picture expired. Upload it again.');
	}

	if (!picture) return { picture: null, pictureWidth: null, pictureHeight: null };
	return {
		picture,
		pictureWidth: data.pictureWidth ? Number(data.pictureWidth) : current.pictureWidth,
		pictureHeight: data.pictureHeight ? Number(data.pictureHeight) : current.pictureHeight
	};
}

/**
 * Delete an old picture from the bucket, unless another event or crew still
 * points at it. Best-effort: an orphaned object is cheaper than a failed save
 * or delete.
 */
export async function releasePicture(
	url: string | null,
	eventId: string,
	kind: 'event' | 'crew' = 'event'
): Promise<void> {
	if (!url) return;
	await withPictureLock(url, async (tx) => {
		if (await pictureUsedElsewhere(url, eventId, tx, kind)) return;
		await deleteImage(url).catch(() => {});
	});
}

/** Release pictures after deleting the event rows, without blocking account deletion. */
export async function releaseEventPictures(
	deletedEvents: { id: string; picture: string | null }[]
): Promise<void> {
	for (const event of deletedEvents) {
		try {
			await releasePicture(event.picture, event.id);
		} catch {
			// A failed reference check must not stop the remaining releases or account deletion.
		}
	}
}

/**
 * The shared city-level location the event maps to, deduplicated across events.
 *
 * Returns `fallback` unless all four geocoding fields came back together — a
 * half-filled set would otherwise pin the event somewhere it is not.
 */
export async function resolveCityId(
	data: Pick<EventFormData, 'city' | 'country' | 'latitude' | 'longitude'>,
	fallback: number | null = null
): Promise<number | null> {
	if (!data.city || !data.country || !data.latitude || !data.longitude) return fallback;

	return findOrCreateCity(
		data.city,
		data.country,
		parseFloat(data.latitude),
		parseFloat(data.longitude)
	);
}
