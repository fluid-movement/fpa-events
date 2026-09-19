import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RankingsTable from './RankingsTable.svelte';
import type { RankingRow } from '#lib/rankings/types';

// An expanded row mounts RankingBreakdown, which reaches for a remote function.
// `$app/server` has no meaning outside a running SvelteKit server, so the module
// is replaced wholesale — mocking it also stops its imports from loading. The
// promise never settles, which parks the component in its pending branch; what
// it renders once resolved is covered by the join's own tests in
// `#lib/rankings/breakdown.test.ts` and end to end in `tests/integration`.
vi.mock('#lib/api/rankings.remote', () => ({
	getScoringResults: () => new Promise(() => {})
}));

function row(rank: number, fullName: string, points: number, resultsCount = 13): RankingRow {
	return { rank, playerId: `p-${rank}`, fullName, points, resultsCount };
}

const props = (rows: RankingRow[]) => ({ rows, series: 'ranking-open' });

const rows = [
	row(1, 'Francesco Santolin', 1632),
	row(2, 'Riccardo Montanari', 1603),
	row(3, "Daniel O'Neill", 1389),
	row(28, 'Ryan Young', 323)
];

describe('RankingsTable', () => {
	it('renders every player with rank and points', () => {
		render(RankingsTable, { props: props(rows) });

		expect(screen.getByText('Francesco Santolin')).toBeInTheDocument();
		expect(screen.getByText('1632')).toBeInTheDocument();
		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
	});

	it('shows a decimal only when points are fractional', () => {
		render(RankingsTable, { props: props([row(1, 'A Player', 203.8), row(2, 'B Player', 360)]) });

		expect(screen.getByText('203.8')).toBeInTheDocument();
		expect(screen.getByText('360')).toBeInTheDocument();
	});

	it('does not mount the breakdown until the row is expanded', async () => {
		// The detail is fetched on expand rather than shipped with the table, so
		// an unexpanded row must not reach for it.
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		expect(screen.queryByTestId('rankings-breakdown-loading')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('rankings-expand-p-1'));

		expect(screen.getByTestId('rankings-breakdown-loading')).toBeInTheDocument();
	});

	it('offers no expander for a player with no scoring events', () => {
		render(RankingsTable, { props: props([row(1, 'No Results', 0, 0)]) });

		expect(screen.queryByTestId('rankings-expand-p-1')).not.toBeInTheDocument();
	});

	it('filters live as the user types', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		await user.type(screen.getByTestId('rankings-search'), 'young');

		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
		expect(screen.queryByText('Francesco Santolin')).not.toBeInTheDocument();
	});

	it('matches case-insensitively and on any part of the name', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		await user.type(screen.getByTestId('rankings-search'), 'MONTAN');
		expect(screen.getByText('Riccardo Montanari')).toBeInTheDocument();
		expect(screen.queryByText('Ryan Young')).not.toBeInTheDocument();
	});

	it('keeps the real rank of a filtered player rather than renumbering', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		await user.type(screen.getByTestId('rankings-search'), 'young');

		// Ryan Young is 28th overall; searching must not make him look 1st.
		expect(screen.getByText('28')).toBeInTheDocument();
		expect(screen.queryByText('1')).not.toBeInTheDocument();
	});

	it('reports when nothing matches', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		await user.type(screen.getByTestId('rankings-search'), 'zzzz');

		expect(screen.getByTestId('rankings-no-matches')).toBeInTheDocument();
		expect(screen.queryByTestId('rankings-table')).not.toBeInTheDocument();
	});

	it('clears the search and restores the full list', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: props(rows) });

		await user.type(screen.getByTestId('rankings-search'), 'young');
		expect(screen.queryByText('Francesco Santolin')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('rankings-search-clear'));

		expect(screen.getByText('Francesco Santolin')).toBeInTheDocument();
		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
	});

	it('offers no clear button when the search is empty', () => {
		render(RankingsTable, { props: props(rows) });
		expect(screen.queryByTestId('rankings-search-clear')).not.toBeInTheDocument();
	});

	it('renders an empty-division message instead of a table', () => {
		render(RankingsTable, { props: props([]) });

		expect(screen.getByText(/No ranked players/)).toBeInTheDocument();
		expect(screen.queryByTestId('rankings-table')).not.toBeInTheDocument();
	});
});
