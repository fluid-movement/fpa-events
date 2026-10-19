import { describe, expect, it } from 'vitest';
import { BANNER_MIN_RATIO, heroLayout } from './heroLayout';

describe('heroLayout', () => {
	it('uses a banner from the 1.4 ratio upwards', () => {
		expect(BANNER_MIN_RATIO).toBe(1.4);
		expect(heroLayout(1400, 1000)).toBe('banner');
		expect(heroLayout(1399, 1000)).toBe('split');
	});

	it('picks a banner for wide pictures and split for the rest', () => {
		expect(heroLayout(1600, 700)).toBe('banner');
		expect(heroLayout(1200, 900)).toBe('split');
		expect(heroLayout(800, 1200)).toBe('split');
		expect(heroLayout(1000, 1000)).toBe('split');
	});

	it('falls back to unknown when a size is missing or invalid', () => {
		expect(heroLayout(null, 900)).toBe('unknown');
		expect(heroLayout(1200, undefined)).toBe('unknown');
		expect(heroLayout(null, null)).toBe('unknown');
		expect(heroLayout(0, 900)).toBe('unknown');
		expect(heroLayout(1200, -900)).toBe('unknown');
		expect(heroLayout(Number.NaN, 900)).toBe('unknown');
		expect(heroLayout(1200, Number.POSITIVE_INFINITY)).toBe('unknown');
	});
});
