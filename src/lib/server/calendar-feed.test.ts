import { describe, it, expect } from 'vitest';
import { buildCalendarFeed, calendarName } from './calendar-feed';

const event = {
	id: 'e1',
	name: 'Jam\r\nSUMMARY:evil',
	location: 'Park\nLOCATION:evil',
	startDate: new Date('2026-01-01T10:00:00Z'),
	endDate: new Date('2026-01-01T12:00:00Z')
};

// Unfolded content lines: ical-generator folds long lines with CRLF + space.
const lines = (feed: string) => feed.replace(/\r\n /g, '').split('\r\n');

describe('buildCalendarFeed', () => {
	it('keeps a line break in the user name from injecting lines', () => {
		const feed = buildCalendarFeed(
			'Ann\r\nBEGIN:VEVENT\r\nSUMMARY:injected\nX-EVIL:1\r\x00\x7f',
			[],
			'https://x.test'
		);
		const all = lines(feed);
		expect(all.some((l) => l.startsWith('X-EVIL') || l.startsWith('SUMMARY'))).toBe(false);
		expect(all.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(0);
		expect(all.filter((l) => l.startsWith('NAME:'))).toHaveLength(1);
		expect(all.filter((l) => l.startsWith('X-WR-CALNAME:'))).toHaveLength(1);
	});

	it('keeps event name and location escaped in SUMMARY and LOCATION', () => {
		const all = lines(buildCalendarFeed('Ann', [event], 'https://x.test'));
		expect(all.filter((l) => l.startsWith('SUMMARY:'))).toHaveLength(1);
		expect(all.filter((l) => l.startsWith('LOCATION:'))).toHaveLength(1);
		expect(all.some((l) => l === 'LOCATION:evil' || l === 'SUMMARY:evil')).toBe(false);
		expect(all.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
	});
});

describe('calendarName', () => {
	it('strips every C0 control and DEL', () => {
		const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join('');
		expect(calendarName(`a${controls}\u007fb`)).toBe('FPA Events — a b');
	});
});
