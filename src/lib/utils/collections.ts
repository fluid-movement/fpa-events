/**
 * Group items by a derived key, preserving both insertion orders.
 *
 * Three places were hand-rolling the same `has`/`set`/`push` dance; a plain
 * `Map` is deliberate — none of the callers mutate the result after building it,
 * so `SvelteMap`'s reactivity would be overhead for nothing.
 */
export function groupBy<T, K>(items: Iterable<T>, keyOf: (item: T) => K): Map<K, T[]> {
	const groups = new Map<K, T[]>();
	for (const item of items) {
		const key = keyOf(item);
		const existing = groups.get(key);
		if (existing) existing.push(item);
		else groups.set(key, [item]);
	}
	return groups;
}
