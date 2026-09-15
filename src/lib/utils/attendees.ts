/**
 * Build the "tom, anna and chris and 3 others attending" summary shown under an
 * event's RSVP control.
 *
 * `namedFirstNames` holds only attendees who allow their name to be shown, while
 * `totalCount` counts everyone who RSVP'd. Anyone who opted out therefore falls
 * into the "and N others" remainder rather than disappearing from the total.
 *
 * Returns `null` when nobody is attending.
 */
export function attendeeSummary(
	namedFirstNames: string[],
	totalCount: number,
	isPast = false,
	maxNames = 3
): string | null {
	if (totalCount === 0) return null;

	const shown = namedFirstNames.slice(0, maxNames);
	const rest = totalCount - shown.length;

	// Everyone attending has opted out of being named.
	if (shown.length === 0) {
		return `${totalCount} ${totalCount === 1 ? 'person' : 'people'} ${isPast ? 'attended' : 'attending'}`;
	}

	if (rest > 0) {
		return `${shown.join(', ')} and ${rest} other${rest === 1 ? '' : 's'} ${
			isPast ? 'attended' : 'attending'
		}`;
	}

	if (shown.length === 1) {
		return isPast ? `${shown[0]} attended` : `${shown[0]} is attending`;
	}

	return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]} ${
		isPast ? 'attended' : 'are attending'
	}`;
}

/** First name only, for the compact summary line. */
export function firstName(fullName: string): string {
	return fullName.split(' ')[0];
}

/**
 * Co-organizers of an event: everyone holding an `organizing` seat other than
 * the creator, who is always one but is never listed as an invitee.
 */
export function coOrganizers<T extends { status?: string; userId?: string }>(
	attendees: T[],
	ownerId: string
): T[] {
	return attendees.filter((a) => a.status === 'organizing' && a.userId !== ownerId);
}
