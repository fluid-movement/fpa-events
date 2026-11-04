export const LAST_CREW_ADMIN_MESSAGE =
	'Name another crew admin before leaving, being demoted or removed, switching crews, or deleting your account.';

export type CrewExit = 'leave' | 'demote' | 'remove' | 'switch' | 'deleteAccount';

/** Only an explicit, confirmed leave may delete a one-person crew. */
export function crewExitBlocked(
	role: 'admin' | 'member',
	adminCount: number,
	memberCount: number,
	action: CrewExit
): boolean {
	return role === 'admin' && adminCount <= 1 && !(action === 'leave' && memberCount === 1);
}
