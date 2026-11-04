import { pictureUsedElsewhere } from '#lib/server/eventForm';
import { deleteImage, listUploadedImages, r2Configured } from '#lib/server/r2';
import { withPictureLock } from '#lib/server/picture-storage';

export const UPLOAD_GRACE_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_SWEEP_MS = 60 * 60 * 1000;

/** Only generated upload keys; legacy pictures/ objects are never candidates. */
export function isExpiredUpload(key: string, modified: Date, now: number): boolean {
	return (
		/^events\/[0-9a-hjkmnp-tv-z]{26}\.(jpg|png|gif|webp|avif)$/.test(key) &&
		modified.getTime() < now - UPLOAD_GRACE_MS
	);
}

export async function sweepUnusedUploads(now = Date.now()): Promise<void> {
	for await (const object of listUploadedImages()) {
		if (!isExpiredUpload(object.key, object.modified, now)) continue;
		await withPictureLock(object.url, async (tx) => {
			if (!(await pictureUsedElsewhere(object.url, null, tx))) await deleteImage(object.url);
		});
	}
}

/** Single flight per process; failures leave objects for the next sweep. */
export function scheduleUploadCleanup(
	sweep: () => Promise<void> = sweepUnusedUploads,
	report: (error: unknown) => void = (error) => console.error('Upload cleanup failed', error)
): () => void {
	let running = false;
	const run = async () => {
		if (running) return;
		running = true;
		try {
			await sweep();
		} catch (error) {
			report(error);
		} finally {
			running = false;
		}
	};
	void run();
	const timer = setInterval(() => {
		void run();
	}, UPLOAD_SWEEP_MS);
	timer.unref?.();
	return () => clearInterval(timer);
}

let started = false;
export function startUploadCleanup(): void {
	if (started || !r2Configured()) return;
	started = true;
	scheduleUploadCleanup();
}
