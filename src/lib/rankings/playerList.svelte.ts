/** Rendered up front; the rest is one click away. All data is already loaded. */
export const INITIAL_ROWS = 100;

/** Medal tint for the top three. */
export function rankTint(rank: number): string {
	if (rank === 1) return 'text-medal-gold';
	if (rank === 2) return 'text-medal-silver';
	if (rank === 3) return 'text-medal-bronze';
	return 'text-muted-foreground';
}

/**
 * Search-and-truncate behaviour shared by the rankings and ratings tables.
 * Filtering is client-side: the whole series is already loaded, so there is no
 * request per keystroke.
 */
export class PlayerList<T extends { fullName: string }> {
	search = $state('');
	showAll = $state(false);

	#rows: () => T[];

	constructor(rows: () => T[]) {
		this.#rows = rows;
	}

	filtered = $derived.by(() => {
		const needle = this.search.trim().toLowerCase();
		if (!needle) return this.#rows();
		return this.#rows().filter((row) => row.fullName.toLowerCase().includes(needle));
	});

	// While searching, show every match — a name buried at rank 200 is exactly
	// what someone is searching for.
	visible = $derived(
		this.showAll || this.search.trim() ? this.filtered : this.filtered.slice(0, INITIAL_ROWS)
	);

	hiddenCount = $derived(this.search.trim() ? 0 : Math.max(0, this.filtered.length - INITIAL_ROWS));
}
