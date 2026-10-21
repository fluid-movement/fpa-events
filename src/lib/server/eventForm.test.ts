import * as v from 'valibot';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	eventFormSchema,
	isUploadedPictureUrl,
	releaseEventPictures,
	releasePicture
} from './eventForm';

const mocks = vi.hoisted(() => ({ select: vi.fn(), deleteImage: vi.fn() }));
vi.mock('#lib/server/db', () => ({ db: { select: mocks.select } }));
vi.mock('#lib/server/r2', () => ({ deleteImage: mocks.deleteImage }));

describe('releaseEventPictures', () => {
	beforeEach(() => {
		// The owned event rows have already been deleted; no references remain by default.
		mocks.select.mockReset().mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) })
		});
		mocks.deleteImage.mockReset().mockResolvedValue(undefined);
	});

	it('releases a shared picture for each deleted owned event', async () => {
		const picture = 'https://test.r2.dev/events/shared-owned.jpg';

		await expect(
			releaseEventPictures([
				{ id: 'owned-one', picture },
				{ id: 'owned-two', picture }
			])
		).resolves.toBeUndefined();

		expect(mocks.deleteImage.mock.calls).toEqual([[picture], [picture]]);
	});

	it("keeps a picture still referenced by another user's event", async () => {
		mocks.select.mockReturnValue({
			from: () => ({
				where: () => ({ limit: () => Promise.resolve([{ id: 'other-users-event' }]) })
			})
		});

		await releaseEventPictures([{ id: 'owned', picture: 'https://test.r2.dev/events/shared.jpg' }]);

		expect(mocks.deleteImage).not.toHaveBeenCalled();
	});

	it('continues releasing pictures when deleteImage throws', async () => {
		mocks.deleteImage.mockImplementationOnce(() => {
			throw new Error('R2 unavailable');
		});
		const failedPicture = 'https://test.r2.dev/events/failed.jpg';
		const otherPicture = 'https://test.r2.dev/events/other.jpg';

		await expect(
			releaseEventPictures([
				{ id: 'failed', picture: failedPicture },
				{ id: 'other', picture: otherPicture }
			])
		).resolves.toBeUndefined();

		expect(mocks.deleteImage.mock.calls).toEqual([[failedPicture], [otherPicture]]);
	});

	it('continues releasing pictures when a database reference check throws', async () => {
		mocks.select.mockReturnValueOnce({
			from: () => ({
				where: () => ({ limit: () => Promise.reject(new Error('Database unavailable')) })
			})
		});
		const otherPicture = 'https://test.r2.dev/events/other.jpg';

		await expect(
			releaseEventPictures([
				{ id: 'failed', picture: 'https://test.r2.dev/events/failed.jpg' },
				{ id: 'other', picture: otherPicture }
			])
		).resolves.toBeUndefined();

		expect(mocks.deleteImage).toHaveBeenCalledExactlyOnceWith(otherPicture);
	});

	it('skips events without a picture', async () => {
		await expect(
			releaseEventPictures([
				{ id: 'no-picture', picture: null },
				{ id: 'empty-picture', picture: '' }
			])
		).resolves.toBeUndefined();

		expect(mocks.select).not.toHaveBeenCalled();
		expect(mocks.deleteImage).not.toHaveBeenCalled();
	});
});

describe('releasePicture', () => {
	beforeEach(() => {
		mocks.select.mockReset();
		mocks.deleteImage.mockReset().mockResolvedValue(undefined);
	});

	function remainingReferences(rows: { id: string }[]) {
		mocks.select.mockReturnValue({
			from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) })
		});
	}

	it('releases a picture once its owned events have been deleted', async () => {
		remainingReferences([]);
		const picture = 'https://test.r2.dev/events/deleted-owner.jpg';

		await releasePicture(picture, 'deleted-event');

		expect(mocks.deleteImage).toHaveBeenCalledExactlyOnceWith(picture);
	});

	it("keeps a picture still referenced by another user's event", async () => {
		remainingReferences([{ id: 'other-users-event' }]);

		await releasePicture('https://test.r2.dev/events/shared.jpg', 'deleted-event');

		expect(mocks.deleteImage).not.toHaveBeenCalled();
	});

	it('allows deletion to continue when R2 fails', async () => {
		remainingReferences([]);
		mocks.deleteImage.mockRejectedValueOnce(new Error('R2 unavailable'));

		await expect(
			releasePicture('https://test.r2.dev/events/deleted-owner.jpg', 'deleted-event')
		).resolves.toBeUndefined();
	});
});

// The gate that stops an organizer adopting someone else's picture URL (and
// then having the server delete it on replace).
describe('isUploadedPictureUrl', () => {
	const PUBLIC = 'https://cdn.example.com';

	it('accepts a fresh upload key', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, PUBLIC)).toBe(true);
	});

	it('tolerates a trailing slash on the configured public URL', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, `${PUBLIC}/`)).toBe(true);
	});

	it.each([
		['another host', 'https://evil.example.com/events/01abc.jpg'],
		['a legacy pictures/ key', `${PUBLIC}/pictures/old.jpg`],
		['a nested path', `${PUBLIC}/events/../pictures/old.jpg`],
		['a lookalike host', `${PUBLIC}.evil.com/events/01abc.jpg`]
	])('rejects %s', (_label, url) => {
		expect(isUploadedPictureUrl(url, PUBLIC)).toBe(false);
	});

	it('accepts nothing when no bucket is configured', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, '')).toBe(false);
	});
});

describe('eventFormSchema dates', () => {
	const form = (startDate: string, endDate: string) => ({
		name: 'Jam',
		description: '',
		location: 'Berlin',
		startDate,
		endDate
	});
	const endDateIssues = (startDate: string, endDate: string) => {
		const result = v.safeParse(eventFormSchema, form(startDate, endDate));
		return result.success
			? []
			: result.issues.filter((issue) => v.getDotPath(issue) === 'endDate').map((i) => i.message);
	};

	it('accepts a range, and a single-day event', () => {
		expect(v.safeParse(eventFormSchema, form('2026-10-14', '2026-10-17')).success).toBe(true);
		expect(v.safeParse(eventFormSchema, form('2026-10-14', '2026-10-14')).success).toBe(true);
	});

	it('rejects an end before the start, on the end date field', () => {
		expect(endDateIssues('2026-10-17', '2026-10-14')).toEqual([
			'The event cannot end before it starts.'
		]);
	});

	it.each([
		['empty', ''],
		['not a date', 'next tuesday'],
		['an impossible month', '2026-13-01'],
		['a day that rolls over', '2026-02-30'],
		['a timestamp', '2026-10-14T10:00']
	])('rejects a date that is %s', (_label, value) => {
		expect(v.safeParse(eventFormSchema, form(value, '2026-10-17')).success).toBe(false);
	});
});

describe('picture dimension validation', () => {
	const event = {
		name: 'Test',
		description: '',
		location: '',
		startDate: '2030-01-01',
		endDate: '2030-01-02'
	};
	it.each(['abc', 'NaN', 'Infinity', '-1', '0', '12junk', '1.5', '2147483648', '100001'])(
		'rejects %s for either dimension',
		(value) => {
			for (const field of ['pictureWidth', 'pictureHeight']) {
				expect(v.safeParse(eventFormSchema, { ...event, [field]: value }).success).toBe(false);
			}
		}
	);
	it.each(['', '1', '1920', '100000'])('accepts %s and omitted dimensions', (value) => {
		expect(
			v.safeParse(eventFormSchema, { ...event, pictureWidth: value, pictureHeight: value }).success
		).toBe(true);
		expect(v.safeParse(eventFormSchema, event).success).toBe(true);
	});
	it.each(['name', 'location', 'description', 'city', 'country', 'picture'])(
		'rejects NUL in %s',
		(field) => {
			expect(v.safeParse(eventFormSchema, { ...event, [field]: 'bad\0input' }).success).toBe(false);
		}
	);
});
