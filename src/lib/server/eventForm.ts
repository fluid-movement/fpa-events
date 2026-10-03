import * as v from 'valibot';
import { findOrCreateEventLocation } from '#lib/server/db/eventLocations';

/**
 * The event form, shared by create and edit — they post the same fields, and
 * had drifted into two identical copies of this schema.
 *
 * Everything arrives as a string because it comes from `FormData`; the city
 * fields are filled in by `EventLocationInput` only when a geocoding suggestion
 * was picked, so they are all optional and only honoured as a complete set.
 */
export const eventFormSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string(),
	city: v.optional(v.string()),
	country: v.optional(v.string()),
	latitude: v.optional(v.string()),
	longitude: v.optional(v.string()),
	picture: v.optional(v.string()),
	pictureWidth: v.optional(v.string()),
	pictureHeight: v.optional(v.string()),
	turnstileToken: v.optional(v.string())
});

export type EventFormData = v.InferOutput<typeof eventFormSchema>;

/** The three picture columns, keeping `fallback` wherever the form sent nothing. */
export function parsePictureFields(
	data: EventFormData,
	fallback: { picture: string | null; pictureWidth: number | null; pictureHeight: number | null }
) {
	return {
		picture: data.picture || fallback.picture,
		pictureWidth: data.pictureWidth ? parseInt(data.pictureWidth, 10) : fallback.pictureWidth,
		pictureHeight: data.pictureHeight ? parseInt(data.pictureHeight, 10) : fallback.pictureHeight
	};
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
