import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import VenueLocationPicker from './VenueLocationPicker.svelte';
import { stubFormFields } from '../../test/form-fields';
import type { RemoteFormFields } from '$app/server';
import type { GeocodingResult } from '#lib/geocoding';

// Leaflet touches `window` and draws a real map; the picker only needs the
// promise never to produce one for these assertions.
vi.mock('#lib/leaflet', () => ({
	loadLeaflet: () => new Promise(() => {}),
	addOsmTiles: vi.fn()
}));

vi.mock('#lib/geocoding', () => ({ autocomplete: vi.fn() }));

const { autocomplete } = await import('#lib/geocoding');

type VenueFields = { name: string; address?: string; latitude?: string; longitude?: string };

const HIT: GeocodingResult = {
	displayName: 'Hyde Park, London',
	name: 'Hyde Park',
	city: 'London',
	country: 'United Kingdom',
	lat: 51.507,
	lng: -0.165
};

/** Type into the address search and click the single suggestion it returns. */
async function pickTheSuggestion() {
	vi.mocked(autocomplete).mockResolvedValue([HIT]);

	await fireEvent.input(screen.getByLabelText('Search address'), { target: { value: 'hyde' } });
	// The combobox debounces for 300ms before it fetches.
	vi.advanceTimersByTime(300);

	const option = await screen.findByRole('button', { name: HIT.displayName });
	await fireEvent.click(option);
}

describe('VenueLocationPicker', () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.mocked(autocomplete).mockReset();
	});

	it('fills an empty venue name from the search hit', async () => {
		const fields = stubFormFields<RemoteFormFields<VenueFields>>();
		render(VenueLocationPicker, { fields });

		await pickTheSuggestion();

		await waitFor(() => expect(fields.name.value()).toBe('Hyde Park'));
	});

	// The regression: the venue-name input used to be `bind:value`, so the guard
	// could read a local mirror. Under `fields.name.as('text', …)` SvelteKit owns
	// the value, and a mirror would sit empty forever — making every search hit
	// look like it was landing in an empty box.
	it('leaves a venue name the organizer typed alone', async () => {
		const fields = stubFormFields<RemoteFormFields<VenueFields>>();
		render(VenueLocationPicker, { fields });

		// What Kit's form-level `input` listener does on the first keystroke.
		fields.name.set('Our usual spot');

		await pickTheSuggestion();

		expect(fields.name.value()).toBe('Our usual spot');
	});

	// The case the stale mirror actually broke: once the organizer has typed and
	// then cleared the box, the field is empty but dirty. The old guard read a
	// mirror that had never left `''`, so it "filled" a local variable nothing
	// rendered, and the box stayed empty.
	it('fills the venue name again after the organizer clears the box', async () => {
		const fields = stubFormFields<RemoteFormFields<VenueFields>>();
		render(VenueLocationPicker, { fields });

		fields.name.set('Our usual spot');
		fields.name.set('');

		await pickTheSuggestion();

		await waitFor(() => expect(fields.name.value()).toBe('Hyde Park'));
	});

	it('writes the coordinates of the search hit into the hidden fields', async () => {
		const fields = stubFormFields<RemoteFormFields<VenueFields>>();
		const { container } = render(VenueLocationPicker, { fields });

		await pickTheSuggestion();

		await waitFor(() => {
			const latitude = container.querySelector<HTMLInputElement>('input[name="latitude"]');
			const longitude = container.querySelector<HTMLInputElement>('input[name="longitude"]');
			expect(latitude?.value).toBe(String(HIT.lat));
			expect(longitude?.value).toBe(String(HIT.lng));
		});
	});
});
