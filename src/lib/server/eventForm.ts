import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { R2_PUBLIC_URL } from '$app/env/private';
import { db } from '#lib/server/db';
import { events } from '#lib/server/db/schema';
import { findOrCreateEventLocation } from '#lib/server/db/eventLocations';
import { deleteImage } from '#lib/server/r2';

/**
 * The event form, shared by create and edit — they post the same fields, and
 * had drifted into two identical copies of this schema.
 *
 * Everything arrives as a string because it comes from `FormData`; the city
 * fields are filled in by `EventLocationInput` only when a geocoding suggestion
 * was picked, so they are all optional and only honoured as a complete set.
 */
/** A real calendar date as the date picker sends it, `yyyy-mm-dd`. */
const isoDate = v.pipe(
	v.string(),
	v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
	// Rejects 2026-13-01 (Invalid Date) and 2026-02-30 (which Date rolls over).
	v.check((value) => {
		const date = new Date(`${value}T00:00:00Z`);
		return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
	}, 'Pick a valid date.')
);

export const eventFormSchema = v.pipe(
	v.object({
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
		description: v.string(),
		startDate: isoDate,
		endDate: isoDate,
		location: v.string(),
		city: v.optional(v.string()),
		country: v.optional(v.string()),
		latitude: v.optional(v.string()),
		longitude: v.optional(v.string()),
		picture: v.optional(v.string()),
		pictureWidth: v.optional(v.string()),
		pictureHeight: v.optional(v.string()),
		turnstileToken: v.optional(v.string())
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

/** Whether any event other than `eventId` uses `url` as its picture. */
async function pictureUsedElsewhere(url: string, eventId: string | null): Promise<boolean> {
	const [row] = await db
		.select({ id: events.id })
		.from(events)
		.where(eventId ? and(eq(events.picture, url), ne(events.id, eventId)) : eq(events.picture, url))
		.limit(1);
	return !!row;
}

/**
 * The three picture columns, keeping `current` wherever the form sent nothing.
 *
 * The picture URL comes from a hidden form field, so it is checked here: a new
 * value must be a fresh upload into our bucket that no other event uses.
 * Otherwise an organizer could adopt another event's image and then, by
 * replacing it, have the server delete it (see `releasePicture`). An event's
 * existing value — including legacy `/pictures/` URLs from the migration — is
 * always allowed to stay.
 */
export async function parsePictureFields(
	data: EventFormData,
	current: PictureColumns,
	eventId: string | null
): Promise<PictureColumns> {
	const picture = data.picture || current.picture;
	if (picture && picture !== current.picture) {
		if (!isUploadedPictureUrl(picture) || (await pictureUsedElsewhere(picture, eventId))) {
			error(400, 'Invalid picture');
		}
	}

	return {
		picture,
		pictureWidth: data.pictureWidth ? parseInt(data.pictureWidth, 10) : current.pictureWidth,
		pictureHeight: data.pictureHeight ? parseInt(data.pictureHeight, 10) : current.pictureHeight
	};
}

/**
 * Delete an event's old picture from the bucket, unless another event still
 * points at it. Best-effort: an orphaned object is cheaper than a failed save
 * or delete.
 */
export async function releasePicture(url: string | null, eventId: string): Promise<void> {
	if (!url || (await pictureUsedElsewhere(url, eventId))) return;
	await deleteImage(url).catch(() => {});
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
export async function resolveEventLocationId(
	data: EventFormData,
	fallback: number | null = null
): Promise<number | null> {
	if (!data.city || !data.country || !data.latitude || !data.longitude) return fallback;

	return findOrCreateEventLocation(
		data.city,
		data.country,
		parseFloat(data.latitude),
		parseFloat(data.longitude)
	);
}
