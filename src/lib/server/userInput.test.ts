// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { guardUserWrite, parseUserName } from './userInput';

describe('parseUserName', () => {
	it('trims and accepts an ordinary name', () => {
		expect(parseUserName('  Ada Lovelace ')).toBe('Ada Lovelace');
		expect(parseUserName('Zoë 山田')).toBe('Zoë 山田');
	});

	it.each([
		['empty', ''],
		['blank', '   '],
		['101 characters', 'x'.repeat(101)],
		['a NUL', 'Ada\u0000'],
		['a line break', 'Ada\r\nDESCRIPTION:injected'],
		['a tab', 'Ada\tL'],
		['a line separator', 'Ada L'],
		['a number', 42],
		['an object', { a: 1 }],
		['an array', ['Ada']],
		['null', null],
		['undefined', undefined]
	])('refuses %s', (_label, value) => {
		expect(() => parseUserName(value)).toThrow();
	});
});

describe('guardUserWrite', () => {
	it('drops the image on create and update', () => {
		expect(
			guardUserWrite({ name: 'Ada', image: 'https://evil.example/p.gif' }, { requireName: true })
		).toEqual({ data: { name: 'Ada', image: null } });
		expect(guardUserWrite({ image: 'data:image/png;base64,AAAA' }, { requireName: false })).toEqual(
			{
				data: { image: null }
			}
		);
	});

	it('requires a name on create but not on an update that leaves it alone', () => {
		expect(() => guardUserWrite({ email: 'a@b.c' }, { requireName: true })).toThrow();
		expect(guardUserWrite({ showAttendance: false }, { requireName: false })).toEqual({
			data: { showAttendance: false }
		});
	});

	it('refuses a bad name on update', () => {
		expect(() => guardUserWrite({ name: 'a\u0000b' }, { requireName: false })).toThrow();
	});
});
