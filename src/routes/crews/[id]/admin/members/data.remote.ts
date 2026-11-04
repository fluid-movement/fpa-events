import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ulid } from 'ulid';
import { crewMagicLinks, crewMembers } from '#lib/server/db/schema';
import { requireCrewAdmin } from '#lib/server/authz';
import {
	assertCrewAdmin,
	assertCrewExit,
	removeCrewSeat,
	withCrewMembership
} from '#lib/server/crew-membership';
import { text } from '#lib/server/validation';

const crewSchema = v.object({ crewId: text });
const memberSchema = v.object({ crewId: text, userId: text });

export const generateLink = form(crewSchema, async ({ crewId }) => {
	await requireCrewAdmin(crewId);
	const { locals } = getRequestEvent();
	await withCrewMembership(locals.user!.id, [crewId], async (tx) => {
		await assertCrewAdmin(tx, crewId, locals.user!.id, locals.role === 'admin');
		await tx
			.insert(crewMagicLinks)
			.values({
				id: ulid().toLowerCase(),
				crewId,
				expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
			});
	});
});

export const revokeLink = form(
	v.object({ crewId: text, token: text }),
	async ({ crewId, token }) => {
		await requireCrewAdmin(crewId);
		const { locals } = getRequestEvent();
		await withCrewMembership(locals.user!.id, [crewId], async (tx) => {
			await assertCrewAdmin(tx, crewId, locals.user!.id, locals.role === 'admin');
			await tx
				.delete(crewMagicLinks)
				.where(and(eq(crewMagicLinks.crewId, crewId), eq(crewMagicLinks.id, token)));
		});
	}
);

export const changeRole = form(
	v.object({ ...memberSchema.entries, role: v.picklist(['admin', 'member']) }),
	async ({ crewId, userId, role }) => {
		await requireCrewAdmin(crewId);
		const { locals } = getRequestEvent();
		await withCrewMembership(userId, [crewId], async (tx, membership) => {
			await assertCrewAdmin(tx, crewId, locals.user!.id, locals.role === 'admin');
			if (!membership || membership.crewId !== crewId) error(404, 'Member not found');
			if (role === 'member') await assertCrewExit(tx, membership, 'demote');
			await tx.update(crewMembers).set({ role }).where(eq(crewMembers.userId, userId));
		});
		redirect(303, resolve('/crews/[id]/admin/members', { id: crewId }));
	}
);

export const removeMember = form(memberSchema, async ({ crewId, userId }) => {
	await requireCrewAdmin(crewId);
	const { locals } = getRequestEvent();
	await withCrewMembership(userId, [crewId], async (tx, membership) => {
		await assertCrewAdmin(tx, crewId, locals.user!.id, locals.role === 'admin');
		if (!membership || membership.crewId !== crewId) error(404, 'Member not found');
		await assertCrewExit(tx, membership, 'remove');
		await removeCrewSeat(tx, membership);
	});
	redirect(303, resolve('/crews/[id]', { id: crewId }));
});
