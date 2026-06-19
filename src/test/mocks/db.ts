import { vi } from 'vitest';

export const db = {
	select: vi.fn(),
	insert: vi.fn(),
	delete: vi.fn(),
	update: vi.fn(),
	query: vi.fn()
};
