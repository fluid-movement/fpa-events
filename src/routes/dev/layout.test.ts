import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from './+layout';

describe('dev layout load', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('404s outside development', () => {
		vi.stubEnv('DEV', false);

		let thrown: unknown;
		try {
			load();
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toMatchObject({ status: 404 });
	});

	it('lets the page load in development', () => {
		vi.stubEnv('DEV', true);

		expect(() => load()).not.toThrow();
	});
});
