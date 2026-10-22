export const UPLOAD_LIMIT = 20;
export const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/** Per-process sliding window. Admission is synchronous, including parallel requests. */
export class UploadLimiter {
	private readonly attempts = new Map<string, number[]>();

	constructor(private readonly maxUsers = 10_000) {}

	/** Zero admits the request; otherwise returns Retry-After seconds. */
	consume(userId: string, now = Date.now()): number {
		// Prune inactive users too, so abandoned accounts do not accumulate forever.
		for (const [id, times] of this.attempts) {
			const active = times.filter((time) => time > now - UPLOAD_WINDOW_MS);
			if (active.length) this.attempts.set(id, active);
			else this.attempts.delete(id);
		}
		const times = this.attempts.get(userId) ?? [];
		if (times.length >= UPLOAD_LIMIT) {
			return Math.max(1, Math.ceil((times[0] + UPLOAD_WINDOW_MS - now) / 1000));
		}
		// Never evict another user's live window to admit a new account.
		if (!this.attempts.has(userId) && this.attempts.size >= this.maxUsers) {
			return Math.ceil(UPLOAD_WINDOW_MS / 1000);
		}
		times.push(now);
		this.attempts.set(userId, times);
		return 0;
	}
}

export const uploadLimiter = new UploadLimiter();
