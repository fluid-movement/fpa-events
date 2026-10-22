// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const state = vi.hoisted(() => ({
	objects: new Map<string, { key: string; url: string; modified: Date }>(),
	references: new Set<string>(),
	locks: new Map<string, Promise<void>>(),
	failDelete: false,
	failReferenceCheck: false,
	configured: true
}));

vi.mock('#lib/server/r2', () => ({
	r2Configured: () => state.configured,
	listUploadedImages: async function* () {
		yield* [...state.objects.values()];
	},
	deleteImage: async (url: string) => {
		if (state.failDelete) throw new Error('R2 unavailable');
		state.objects.delete(url);
	},
	uploadedImageExists: async (url: string) => state.objects.has(url)
}));

// Model transaction locks and queries from the actual emitted SQL, so removing
// the lock, changing its key or moving the reference check outside it breaks
// the concurrent-save regressions. R2 is an in-memory bucket, never a network call.
vi.mock('#lib/server/db', () => ({
	db: {
		transaction: async (work: (tx: unknown) => Promise<unknown>) => {
			const releases: (() => void)[] = [];
			const tx = {
				execute: async (query: SQL) => {
					const sql = new PgDialect().sqlToQuery(query);
					expect(sql.sql).toContain('pg_advisory_xact_lock');
					const key = String(sql.params[0]);
					const previous = state.locks.get(key);
					const current = new Promise<void>((resolve) => releases.push(resolve));
					state.locks.set(key, current);
					await previous;
				},
				select: () => ({
					from: () => ({
						where: (condition: SQL) => ({
							limit: async () => {
								if (state.failReferenceCheck) throw new Error('DB unavailable');
								const url = String(new PgDialect().sqlToQuery(condition).params[0]);
								return state.references.has(url) ? [{ id: 'event' }] : [];
							}
						})
					})
				})
			};
			try {
				return await work(tx);
			} finally {
				for (const release of releases) release();
			}
		}
	}
}));

import {
	sweepUnusedUploads,
	scheduleUploadCleanup,
	UPLOAD_GRACE_MS,
	UPLOAD_SWEEP_MS,
	isExpiredUpload
} from './upload-cleanup';
import { withPictureLock } from './picture-storage';
import { parsePictureFields, type EventFormData } from './eventForm';

const now = Date.UTC(2026, 9, 22);
const key = (n: number) => `events/01arz3ndektsv4rrffq69g5fa${n}.png`;
function object(n: number, age = UPLOAD_GRACE_MS + 1) {
	const upload = {
		key: key(n),
		url: `https://test.r2.dev/${key(n)}`,
		modified: new Date(now - age)
	};
	state.objects.set(upload.url, upload);
	return upload;
}

beforeEach(() => {
	state.objects.clear();
	state.references.clear();
	state.locks.clear();
	state.failDelete = false;
	state.failReferenceCheck = false;
	state.configured = true;
});
afterEach(() => vi.useRealTimers());

describe('unused upload sweep', () => {
	it('deletes only old unreferenced generated uploads, retaining recent, referenced and legacy objects', async () => {
		const orphan = object(0);
		const attached = object(1);
		state.references.add(attached.url);
		const boundary = object(2, UPLOAD_GRACE_MS);
		const fresh = object(3, 1);
		const legacy = {
			key: 'pictures/old.png',
			url: 'https://test.r2.dev/pictures/old.png',
			modified: new Date(0)
		};
		state.objects.set(legacy.url, legacy);
		await sweepUnusedUploads(now);
		expect(state.objects.has(orphan.url)).toBe(false);
		expect([...state.objects.keys()]).toEqual([attached.url, boundary.url, fresh.url, legacy.url]);
	});

	it.each(['failDelete', 'failReferenceCheck'] as const)(
		'retains objects on %s and retries later',
		async (failure) => {
			const orphan = object(0);
			state[failure] = true;
			await expect(sweepUnusedUploads(now)).rejects.toThrow('unavailable');
			expect(state.objects.has(orphan.url)).toBe(true);
			state[failure] = false;
			await sweepUnusedUploads(now);
			expect(state.objects.size).toBe(0);
		}
	);

	it('does not delete an image while its event attachment is committing', async () => {
		const upload = object(0);
		let unlock!: () => void;
		let entered!: () => void;
		const locked = new Promise<void>((resolve) => {
			entered = resolve;
		});
		const wait = new Promise<void>((resolve) => {
			unlock = resolve;
		});
		const save = withPictureLock(upload.url, async (tx) => {
			await parsePictureFields(
				{ picture: upload.url } as EventFormData,
				{ picture: null, pictureWidth: null, pictureHeight: null },
				null,
				tx
			);
			entered();
			await wait;
			state.references.add(upload.url);
		});
		await locked;
		const sweep = sweepUnusedUploads(now);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(state.objects.has(upload.url)).toBe(true);
		unlock();
		await Promise.all([save, sweep]);
		expect(state.objects.has(upload.url)).toBe(true);
		expect(state.references.has(upload.url)).toBe(true);
	});

	it('refuses attachment of a stale URL after cleanup already deleted the image', async () => {
		const upload = object(0);
		await sweepUnusedUploads(now);
		await expect(
			withPictureLock(upload.url, async (tx) => {
				await parsePictureFields(
					{ picture: upload.url } as EventFormData,
					{ picture: null, pictureWidth: null, pictureHeight: null },
					null,
					tx
				);
				state.references.add(upload.url);
			})
		).rejects.toMatchObject({
			status: 400,
			body: { message: 'Picture expired. Upload it again.' }
		});
		expect(state.objects.size).toBe(0);
		expect(state.references.size).toBe(0);
	});

	it('rejects unsafe keys and unknown timestamps as cleanup candidates', () => {
		for (const candidate of [
			'events/../pictures/old.png',
			'events/arbitrary.txt',
			'pictures/' + key(0),
			'events/nested/' + key(0)
		]) {
			expect(isExpiredUpload(candidate, new Date(0), now)).toBe(false);
		}
		expect(isExpiredUpload(key(0), new Date(NaN), now)).toBe(false);
	});
});

describe('cleanup scheduling', () => {
	it('runs immediately and hourly, reports failures and retries without overlap', async () => {
		vi.useFakeTimers();
		let finish!: () => void;
		const first = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const sweep = vi
			.fn()
			.mockReturnValueOnce(first)
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue(undefined);
		const report = vi.fn();
		const stop = scheduleUploadCleanup(sweep, report);
		try {
			expect(sweep).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(UPLOAD_SWEEP_MS);
			expect(sweep).toHaveBeenCalledTimes(1);
			finish();
			await vi.advanceTimersByTimeAsync(UPLOAD_SWEEP_MS);
			expect(report).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(UPLOAD_SWEEP_MS);
			expect(sweep).toHaveBeenCalledTimes(3);
		} finally {
			stop();
		}
		await vi.advanceTimersByTimeAsync(UPLOAD_SWEEP_MS);
		expect(sweep).toHaveBeenCalledTimes(3);
	});
});
