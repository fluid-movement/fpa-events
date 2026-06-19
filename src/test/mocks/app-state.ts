import { vi } from 'vitest';

export const page = {
	params: {},
	url: new URL('http://localhost/'),
	route: { id: null },
	status: 200,
	error: null,
	data: {},
	form: null
};

export const navigating = null;
export const updated = { current: false, check: vi.fn() };
