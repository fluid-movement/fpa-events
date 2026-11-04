import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { crewMagicLinks, crews, crewMembers } from '#lib/server/db/schema';
import { storedIdParam } from '#lib/server/validation';
import { crewExitBlocked } from '#lib/crew-membership-policy';
import type { PageServerLoad } from './$types';

/** GET, including preloads, only previews the invitation. */
export const load = (async ({ params, locals }) => {
	const token = storedIdParam(params.token, 'Invite link not found');
	const [link] = await db
		.select({ crewId: crews.id, crewName: crews.name, expiresAt: crewMagicLinks.expiresAt })
		.from(crewMagicLinks)
		.innerJoin(crews, eq(crews.id, crewMagicLinks.crewId))
		.where(eq(crewMagicLinks.id, token));
	if (!link) error(404, 'Invite link not found');
	if (link.expiresAt <= new Date()) return { expired: true as const };
	if (!locals.user)
		redirect(
			307,
			`${resolve('/sign-in')}?redirect=${encodeURIComponent(resolve('/crews/join/[token]', { token }))}`
		);
	const memberships = await db
		.select({ crewId: crews.id, name: crews.name, role: crewMembers.role })
		.from(crewMembers)
		.innerJoin(crews, eq(crews.id, crewMembers.crewId))
		.where(eq(crewMembers.userId, locals.user.id));
	const current = memberships.length ? memberships[0] : null;
	const members = current
		? await db
				.select({ role: crewMembers.role })
				.from(crewMembers)
				.where(eq(crewMembers.crewId, current.crewId))
		: [];
	return {
		expired: false as const,
		token,
		...link,
		current: current ?? null,
		switchBlocked:
			!!current &&
			current.crewId !== link.crewId &&
			crewExitBlocked(
				current.role,
				members.filter((m) => m.role === 'admin').length,
				members.length,
				'switch'
			)
	};
}) satisfies PageServerLoad;
