import { describe, it, expect } from 'vitest';
import { groupBy } from './collections';

describe('groupBy', () => {
	it('returns an empty map for no items', () => {
		expect(groupBy([], () => 'x').size).toBe(0);
	});

	it('collects items sharing a key', () => {
		const result = groupBy([1, 2, 3, 4], (n) => n % 2);
		expect(result.get(1)).toEqual([1, 3]);
		expect(result.get(0)).toEqual([2, 4]);
	});

	it('keeps groups in first-seen order', () => {
		const result = groupBy(['bat', 'axe', 'bee', 'ant'], (w) => w[0]);
		expect([...result.keys()]).toEqual(['b', 'a']);
	});

	it('keeps items in their original order within a group', () => {
		const result = groupBy(['bat', 'bee', 'bun'], (w) => w[0]);
		expect(result.get('b')).toEqual(['bat', 'bee', 'bun']);
	});
});
