import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import GeocodingCombobox from './GeocodingCombobox.svelte';

vi.mock('$lib/geocoding', () => ({
	autocomplete: vi.fn()
}));

import { autocomplete } from '$lib/geocoding';

const mockResults = [
	{
		displayName: 'Berlin, Germany',
		name: 'Berlin',
		city: 'Berlin',
		country: 'Germany',
		lat: 52.52,
		lng: 13.405
	},
	{
		displayName: 'Bern, Switzerland',
		name: 'Bern',
		city: 'Bern',
		country: 'Switzerland',
		lat: 46.948,
		lng: 7.4474
	},
	{
		displayName: 'Bergen, Norway',
		name: 'Bergen',
		city: 'Bergen',
		country: 'Norway',
		lat: 60.391,
		lng: 5.322
	}
];

describe('GeocodingCombobox — keyboard accessibility', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.mocked(autocomplete).mockResolvedValue(mockResults);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	function getInput() {
		return screen.getByPlaceholderText('Search...');
	}

	async function typeAndFetch(text: string) {
		const input = getInput();
		await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).type(input, text);
		await vi.advanceTimersByTimeAsync(300);
	}

	it('renders with combobox ARIA role and initial expanded=false', () => {
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });

		const combobox = screen.getByRole('combobox');
		expect(combobox).toHaveAttribute('aria-expanded', 'false');
		expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
	});

	it('input has aria-autocomplete and aria-controls attributes', () => {
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });

		const input = getInput();
		expect(input).toHaveAttribute('aria-autocomplete', 'list');
		expect(input).toHaveAttribute('aria-controls', 'geocoding-listbox');
	});

	it('shows suggestion list after typing with first item highlighted', async () => {
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		const combobox = screen.getByRole('combobox');
		expect(combobox).toHaveAttribute('aria-expanded', 'true');

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(3);
		expect(options[0]).toHaveAttribute('aria-selected', 'true');
		expect(options[1]).toHaveAttribute('aria-selected', 'false');
		expect(options[2]).toHaveAttribute('aria-selected', 'false');
	});

	it('sets aria-activedescendant on the input to the first suggestion', async () => {
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		const input = getInput();
		expect(input).toHaveAttribute('aria-activedescendant', 'geocoding-option-0');
	});

	it('ArrowDown moves highlight to the next suggestion and updates aria-activedescendant', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		const input = getInput();
		await user.keyboard('{ArrowDown}');

		const options = screen.getAllByRole('option');
		expect(options[0]).toHaveAttribute('aria-selected', 'false');
		expect(options[1]).toHaveAttribute('aria-selected', 'true');
		expect(input).toHaveAttribute('aria-activedescendant', 'geocoding-option-1');
	});

	it('ArrowUp moves highlight to the previous suggestion', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		await user.keyboard('{ArrowDown}');
		await user.keyboard('{ArrowDown}');

		let options = screen.getAllByRole('option');
		expect(options[2]).toHaveAttribute('aria-selected', 'true');

		await user.keyboard('{ArrowUp}');

		options = screen.getAllByRole('option');
		expect(options[1]).toHaveAttribute('aria-selected', 'true');
	});

	it('ArrowUp at first item stays on first item', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		await user.keyboard('{ArrowUp}');

		const options = screen.getAllByRole('option');
		expect(options[0]).toHaveAttribute('aria-selected', 'true');
	});

	it('Enter selects the highlighted suggestion and closes the list', async () => {
		const onSelect = vi.fn();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect } });
		await typeAndFetch('Ber');

		await user.keyboard('{Enter}');

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(mockResults[0]);

		const combobox = screen.getByRole('combobox');
		expect(combobox).toHaveAttribute('aria-expanded', 'false');
	});

	it('Enter selects the highlighted item after keyboard navigation', async () => {
		const onSelect = vi.fn();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect } });
		await typeAndFetch('Ber');

		await user.keyboard('{ArrowDown}');
		await user.keyboard('{ArrowDown}');
		await user.keyboard('{Enter}');

		expect(onSelect).toHaveBeenCalledWith(mockResults[2]);
	});

	it('Escape closes the suggestion list while keeping the typed query', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		const combobox = screen.getByRole('combobox');
		expect(combobox).toHaveAttribute('aria-expanded', 'true');

		await user.keyboard('{Escape}');

		expect(combobox).toHaveAttribute('aria-expanded', 'false');
		expect(getInput()).toHaveValue('Ber');
	});

	it('Escape with closed list clears the input', async () => {
		const onClear = vi.fn();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn(), onClear } });
		await typeAndFetch('Ber');

		await user.keyboard('{Escape}');
		await user.keyboard('{Escape}');

		expect(getInput()).toHaveValue('');
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('clearing the input text hides the suggestion list', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');

		await user.clear(getInput());

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
	});

	it('mouse click selects a suggestion', async () => {
		const onSelect = vi.fn();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, { props: { onSelect } });
		await typeAndFetch('Ber');

		await user.click(screen.getByText('Bern, Switzerland'));

		expect(onSelect).toHaveBeenCalledWith(mockResults[1]);
	});

	it('getDisplayValue is used to format the input on selection', async () => {
		const onSelect = vi.fn();
		const getDisplayValue = (r: { city: string | null; country: string | null }) =>
			[r.city, r.country].filter(Boolean).join(', ');

		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(GeocodingCombobox, {
			props: { onSelect, getDisplayValue }
		});
		await typeAndFetch('Ber');

		await user.keyboard('{Enter}');

		expect(getInput()).toHaveValue('Berlin, Germany');
	});

	it('displays suggestions in the correct order', async () => {
		render(GeocodingCombobox, { props: { onSelect: vi.fn() } });
		await typeAndFetch('Ber');

		const items = screen.getAllByRole('option');
		expect(items[0]).toHaveTextContent('Berlin, Germany');
		expect(items[1]).toHaveTextContent('Bern, Switzerland');
		expect(items[2]).toHaveTextContent('Bergen, Norway');
	});
});
