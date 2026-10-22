import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db';

export type PictureTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Event attachment and object deletion share this DB lock across processes.
 * The event write must commit before releasing the lock; a reference check
 * outside that transaction could race an orphan sweep.
 */
export function withPictureLock<T>(
	url: string | null | undefined,
	work: (tx: PictureTransaction) => Promise<T>
): Promise<T> {
	return db.transaction(async (tx) => {
		if (url) await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${url}, 0))`);
		return work(tx);
	});
}
