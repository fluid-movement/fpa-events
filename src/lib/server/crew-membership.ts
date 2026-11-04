import { and, asc, eq, inArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { releasePicture } from '#lib/server/eventForm';
import { db } from '#lib/server/db';
import { crewMembers, crews, user } from '#lib/server/db/schema';
import {
	crewExitBlocked,
	LAST_CREW_ADMIN_MESSAGE,
	type CrewExit
} from '#lib/crew-membership-policy';

// Release only after the membership transaction commits, so the reference check
// sees the deleted crew and cleanup failures cannot roll back a successful leave.
const deletedPictures = new WeakMap<object, { id: string; picture: string | null }[]>();

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Serialize changes to a user's unique seat, then lock crews in stable order.
 * Crew locks also serialize admin-count checks with joins and role changes. */
export async function withCrewMembership<T>(
	userId: string,
	crewIds: string[],
	work: (tx: Transaction, membership: typeof crewMembers.$inferSelect | undefined) => Promise<T>
) {
	const pictures: { id: string; picture: string | null }[] = [];
	const result = await db.transaction(async (tx) => {
		deletedPictures.set(tx, pictures);
		await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
		const [membership] = await tx.select().from(crewMembers).where(eq(crewMembers.userId, userId));
		const ids = [...new Set([...crewIds, ...(membership ? [membership.crewId] : [])])].sort();
		if (ids.length) {
			await tx
				.select({ id: crews.id })
				.from(crews)
				.where(inArray(crews.id, ids))
				.orderBy(asc(crews.id))
				.for('update');
		}
		// Role may have changed while waiting on the crew lock.
		const [current] = await tx.select().from(crewMembers).where(eq(crewMembers.userId, userId));
		return work(tx, current);
	});
	for (const crew of pictures) await releasePicture(crew.picture, crew.id, 'crew').catch(() => {});
	return result;
}

export async function assertCrewExit(
	tx: Transaction,
	membership: typeof crewMembers.$inferSelect | undefined,
	action: CrewExit
) {
	if (!membership) return;
	const members = await tx
		.select({ role: crewMembers.role })
		.from(crewMembers)
		.where(eq(crewMembers.crewId, membership.crewId));
	if (
		crewExitBlocked(
			membership.role,
			members.filter((m) => m.role === 'admin').length,
			members.length,
			action
		)
	) {
		error(400, LAST_CREW_ADMIN_MESSAGE);
	}
}

export async function removeCrewSeat(tx: Transaction, membership: typeof crewMembers.$inferSelect) {
	await tx.delete(crewMembers).where(eq(crewMembers.userId, membership.userId));
	const [remaining] = await tx
		.select({ userId: crewMembers.userId })
		.from(crewMembers)
		.where(eq(crewMembers.crewId, membership.crewId))
		.limit(1);
	if (!remaining) {
		const deleted = await tx
			.delete(crews)
			.where(eq(crews.id, membership.crewId))
			.returning({ id: crews.id, picture: crews.picture });
		deletedPictures.get(tx)?.push(...deleted);
	}
}

/** Recheck authorization under the crew lock, including concurrent self-demotion. */
export async function assertCrewAdmin(
	tx: Transaction,
	crewId: string,
	actorId: string,
	siteAdmin: boolean
) {
	if (siteAdmin) return;
	const [admin] = await tx
		.select()
		.from(crewMembers)
		.where(
			and(
				eq(crewMembers.crewId, crewId),
				eq(crewMembers.userId, actorId),
				eq(crewMembers.role, 'admin')
			)
		);
	if (!admin) error(403, 'Only crew admins can manage this crew');
}
