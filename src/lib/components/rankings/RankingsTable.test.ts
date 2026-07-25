import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RankingsTable from './RankingsTable.svelte';
import type { RankingRow } from '$lib/rankings/types';

function row(rank: number, fullName: string, points: number): RankingRow {
	return {
		rank,
		playerId: `p-${rank}`,
		fullName,
		points,
		resultsCount: 13,
		breakdown: [
			{ eventName: 'FPAW2024', division: 'Open Pairs', points: 360 },
			{ eventName: 'FPAW 2025', division: 'Open Co-op', points: 332 }
		]
	};
}

const rows = [
	row(1, 'Francesco Santolin', 1632),
	row(2, 'Riccardo Montanari', 1603),
	row(3, "Daniel O'Neill", 1389),
	row(28, 'Ryan Young', 323)
];

describe('RankingsTable', () => {
	it('renders every player with rank and points', () => {
		render(RankingsTable, { props: { rows } });

		expect(screen.getByText('Francesco Santolin')).toBeInTheDocument();
		expect(screen.getByText('1632')).toBeInTheDocument();
		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
	});

	it('shows a decimal only when points are fractional', () => {
		render(RankingsTable, {
			props: { rows: [row(1, 'A Player', 203.8), row(2, 'B Player', 360)] }
		});

		expect(screen.getByText('203.8')).toBeInTheDocument();
		expect(screen.getByText('360')).toBeInTheDocument();
	});

	it('hides the points breakdown until the row is expanded', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		expect(screen.queryByTestId('rankings-breakdown-p-1')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('rankings-expand-p-1'));

		const breakdown = screen.getByTestId('rankings-breakdown-p-1');
		expect(breakdown).toBeInTheDocument();
		expect(breakdown).toHaveTextContent('FPAW2024');
		expect(breakdown).toHaveTextContent('Open Pairs');
	});

	it('says how many scoring events are shown when the list is trimmed', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		// The fixture has 13 results but only 2 breakdown entries.
		await user.click(screen.getByTestId('rankings-expand-p-1'));
		expect(screen.getByText(/2 of 13/)).toBeInTheDocument();
	});

	it('filters live as the user types', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		await user.type(screen.getByTestId('rankings-search'), 'young');

		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
		expect(screen.queryByText('Francesco Santolin')).not.toBeInTheDocument();
	});

	it('matches case-insensitively and on any part of the name', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		await user.type(screen.getByTestId('rankings-search'), 'MONTAN');
		expect(screen.getByText('Riccardo Montanari')).toBeInTheDocument();
		expect(screen.queryByText('Ryan Young')).not.toBeInTheDocument();
	});

	it('keeps the real rank of a filtered player rather than renumbering', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		await user.type(screen.getByTestId('rankings-search'), 'young');

		// Ryan Young is 28th overall; searching must not make him look 1st.
		expect(screen.getByText('28')).toBeInTheDocument();
		expect(screen.queryByText('1')).not.toBeInTheDocument();
	});

	it('reports when nothing matches', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		await user.type(screen.getByTestId('rankings-search'), 'zzzz');

		expect(screen.getByTestId('rankings-no-matches')).toBeInTheDocument();
		expect(screen.queryByTestId('rankings-table')).not.toBeInTheDocument();
	});

	it('clears the search and restores the full list', async () => {
		const user = userEvent.setup();
		render(RankingsTable, { props: { rows } });

		await user.type(screen.getByTestId('rankings-search'), 'young');
		expect(screen.queryByText('Francesco Santolin')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('rankings-search-clear'));

		expect(screen.getByText('Francesco Santolin')).toBeInTheDocument();
		expect(screen.getByText('Ryan Young')).toBeInTheDocument();
	});

	it('offers no clear button when the search is empty', () => {
		render(RankingsTable, { props: { rows } });
		expect(screen.queryByTestId('rankings-search-clear')).not.toBeInTheDocument();
	});

	it('renders an empty-division message instead of a table', () => {
		render(RankingsTable, { props: { rows: [] } });

		expect(screen.getByText(/No ranked players/)).toBeInTheDocument();
		expect(screen.queryByTestId('rankings-table')).not.toBeInTheDocument();
	});
});
