import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Turnstile, { captchaEnabled } from './Turnstile.svelte';

// The mocked $env/dynamic/public has an empty PUBLIC_TURNSTILE_SITE_KEY (see
// mocks/env-dynamic-public.ts), so the widget is disabled in the test environment.

describe('Turnstile', () => {
	it('reports captcha disabled when no site key is configured', () => {
		expect(captchaEnabled).toBe(false);
	});

	it('renders nothing when the site key is empty', () => {
		const { queryByTestId } = render(Turnstile);
		expect(queryByTestId('turnstile')).toBeNull();
	});

	it('mounts without throwing', () => {
		expect(() => render(Turnstile)).not.toThrow();
	});
});
