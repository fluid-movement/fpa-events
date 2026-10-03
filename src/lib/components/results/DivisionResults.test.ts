import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DivisionResults from './DivisionResults.svelte';
import type { DivisionResult, Team } from '#lib/server/fpa-api/types';

/**
 * The upstream data has three traps — points that mean opposite things under
 * different rulesets, rounds that count backwards, and player GUIDs missing
 * from the directory. These tests are about not falling into them.
 */

const team = (place: number | null, names: string[], points: number | null = null): Team => ({
	place,
	points,
	players: names.map((fullName, i) => ({
		id: `${fullName.replace(/\s+/g, '')}-${i}`,
		fullName,
		unknown: fullName === '?'
	}))
});

const result = (rounds: DivisionResult['rounds']): DivisionResult => ({
	id: 'res-1',
	eventId: 'ev-1',
	eventName: 'Test Event',
	division: 'Open Pairs',
	rounds
});

const round = (number: number, name: string, pools: { name: string; teams: Team[] }[]) => ({
	number,
	name,
	pools
});

describe('DivisionResults', () => {
	it('orders teams by place, not by points', () => {
		// Under SimpleRanking a LOWER score wins, so points disagree with place
		// here. Place is the only field that always means the same thing.
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [
						{ name: 'A', teams: [team(2, ['Runner Up'], 5), team(1, ['Winner'], 900)] }
					])
				])
			}
		});

		const rows = screen.getAllByRole('listitem');
		expect(rows[0]).toHaveTextContent('Winner');
		expect(rows[1]).toHaveTextContent('Runner Up');
	});

	it('puts a team with no recorded place last', () => {
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [{ name: 'A', teams: [team(null, ['Unplaced']), team(3, ['Third'])] }])
				])
			}
		});

		const rows = screen.getAllByRole('listitem');
		expect(rows[0]).toHaveTextContent('Third');
		expect(rows[1]).toHaveTextContent('Unplaced');
	});

	it('labels rounds from their name, since 1 is the final', () => {
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [{ name: 'A', teams: [team(1, ['A Pair'])] }]),
					round(3, 'Quarterfinals', [{ name: 'A', teams: [team(1, ['B Pair'])] }])
				])
			}
		});

		expect(screen.getByText('Finals')).toBeInTheDocument();
		expect(screen.getByText('Quarterfinals')).toBeInTheDocument();
	});

	it('names pools only when a round has more than one', () => {
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [{ name: 'A', teams: [team(1, ['Champion'])] }]),
					round(2, 'Semifinals', [
						{ name: 'A', teams: [team(1, ['Pair One'])] },
						{ name: 'B', teams: [team(1, ['Pair Two'])] }
					])
				])
			}
		});

		// The final's single pool is also called "A", so a naive implementation
		// would print "Pool A" twice.
		expect(screen.getAllByText(/^Pool A$/)).toHaveLength(1);
		expect(screen.getByText(/^Pool B$/)).toBeInTheDocument();
	});

	it('shows a player missing from the directory instead of dropping them', () => {
		// Filtering an unknown member would silently render a trio as a pair.
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [{ name: 'A', teams: [team(1, ['Known Player', '?'])] }])
				])
			}
		});

		expect(screen.getByText('Known Player')).toBeInTheDocument();
		expect(screen.getByText('Unknown Player')).toBeInTheDocument();
	});

	it('does not link a player it has no profile for', () => {
		render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [{ name: 'A', teams: [team(1, ['Known Player', '?'])] }])
				])
			}
		});

		expect(screen.getByText('Known Player').closest('a')).not.toBeNull();
		expect(screen.getByText('Unknown Player').closest('a')).toBeNull();
	});

	it('medals the top three of the final only', () => {
		// Winning a semifinal pool is not a podium.
		const { container } = render(DivisionResults, {
			props: {
				result: result([
					round(1, 'Finals', [
						{ name: 'A', teams: [team(1, ['Gold']), team(2, ['Silver']), team(3, ['Bronze'])] }
					]),
					round(2, 'Semifinals', [{ name: 'A', teams: [team(1, ['Semi Winner'])] }])
				])
			}
		});

		expect(container.querySelectorAll('.text-medal-gold')).toHaveLength(1);
		expect(container.querySelectorAll('.text-medal-silver')).toHaveLength(1);
		expect(container.querySelectorAll('.text-medal-bronze')).toHaveLength(1);
	});

	it('says so when a division has no rounds at all', () => {
		render(DivisionResults, { props: { result: result([]) } });

		expect(screen.getByText('No rounds recorded for this division')).toBeInTheDocument();
	});
});
