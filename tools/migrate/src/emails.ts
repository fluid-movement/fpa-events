/** Preflight the whole batch so canonical-mailbox collisions never merge identities. */
export function normalizeLegacyEmails<T extends { id: string; email: string }>(rows: T[]) {
	const byEmail = new Map<string, string[]>();
	let normalized = 0;
	const users = rows.map((user) => {
		const email = user.email.trim().toLowerCase();
		if (email !== user.email) normalized++;
		const ids = byEmail.get(email) ?? [];
		ids.push(user.id);
		byEmail.set(email, ids);
		return { ...user, email };
	});
	const collisions = [...byEmail.entries()].filter(([, ids]) => ids.length > 1);
	if (collisions.length > 0) {
		throw new Error(
			`Legacy email collisions after normalization (resolve before importing): ${collisions
				.map(
					([email, ids]) =>
						`${JSON.stringify(email)}: user IDs ${ids.map((id) => JSON.stringify(id)).join(', ')}`
				)
				.join('; ')}`
		);
	}
	return { users, normalized };
}
