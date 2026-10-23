import type pg from 'pg';
import type { S3Client } from '@aws-sdk/client-s3';
import type { LocationMap } from './locations';
import { refreshLocations } from './geocode';
import { importDatabase } from './migrate';
import { emptyBucket, listPictures, copyPictures, verifyPictures } from './pictures';
import { verifyDatabase } from './verify';

export interface MigrationOptions {
	dryRun: boolean;
	legacyDatabaseUrl: string;
	targetDatabaseUrl: string;
	legacyBucket: string;
	targetBucket: string;
	publicUrl: string;
}

export interface MigrationAdapters {
	legacy: pg.Pool;
	target: pg.Pool;
	legacyR2: S3Client;
	targetR2: S3Client;
	photonFetch: typeof fetch;
	prompt: (question: string) => Promise<string>;
	loadMap: () => LocationMap;
	saveMap: (map: LocationMap) => void;
	log: (message: string) => void;
	pause: (ms: number) => Promise<void>;
}

function databaseIdentity(url: URL): string {
	return `${url.hostname}:${url.port || '5432'}/${decodeURIComponent(url.pathname.slice(1))}`;
}

export async function migrateAll(
	options: MigrationOptions,
	adapters: MigrationAdapters
): Promise<void> {
	const { legacy, target, legacyR2, targetR2, log } = adapters;
	const sourceUrl = new URL(options.legacyDatabaseUrl);
	const targetUrl = new URL(options.targetDatabaseUrl);
	if (databaseIdentity(sourceUrl) === databaseIdentity(targetUrl)) {
		throw new Error('Refusing to migrate: legacy and target database are identical');
	}
	if (options.legacyBucket === options.targetBucket) {
		throw new Error('Refusing to wipe: legacy and target bucket names are identical');
	}
	const publicUrl = options.publicUrl.replace(/\/$/, '');
	const map = adapters.loadMap();
	const additions = await refreshLocations(legacy, map, adapters.photonFetch, log, adapters.pause);
	// Persist before asking, so declining leaves the mapping available for review.
	adapters.saveMap(map);
	if (additions > 0 && !options.dryRun) {
		const answer = await adapters.prompt(
			'Review the new mappings above. Import them? Type yes or no: '
		);
		if (answer.trim().toLowerCase() !== 'yes')
			throw new Error('Stopped for mapping review; mapping file saved.');
	}
	const client = await target.connect();
	let inTransaction = false;
	try {
		const { rows } = await client.query<{ name: string }>('SELECT current_database() AS name');
		const databaseName = rows[0].name;
		log(
			`Target DB host: ${targetUrl.hostname}:${targetUrl.port || '5432'}; database: ${databaseName}; R2 bucket: ${options.targetBucket}`
		);
		if (databaseName !== decodeURIComponent(targetUrl.pathname.slice(1))) {
			throw new Error('Connected target database does not match the configured database name');
		}
		if (!options.dryRun) {
			const answer = await adapters.prompt(
				`This deletes all target data and EVERY target bucket object. Type the target database name (${databaseName}): `
			);
			if (answer !== databaseName)
				throw new Error('Target database confirmation did not match; nothing deleted.');
		}
		const pictures = await listPictures(legacy);
		// Fail before wiping on missing/unsafe source objects, even if a target copy exists.
		const sourceErrors = await verifyPictures(
			legacyR2,
			options.legacyBucket,
			pictures.map((p) => p.picture)
		);
		if (sourceErrors.length) throw new Error(sourceErrors.join('\n'));
		await client.query('BEGIN');
		inTransaction = true;
		const report = await importDatabase(legacy, client, map, publicUrl);
		// All DB-only checks must pass before the first irreversible R2 write.
		const verifiedKeys = await verifyDatabase(legacy, client, map, publicUrl, log);
		await emptyBucket(targetR2, options.targetBucket, options.dryRun, log);
		if (options.dryRun) {
			for (const p of pictures) log(`Would copy R2 ${JSON.stringify(p.picture)}`);
		} else {
			await copyPictures(
				legacyR2,
				targetR2,
				options.legacyBucket,
				options.targetBucket,
				pictures,
				log
			);
		}
		const pictureErrors = options.dryRun
			? []
			: await verifyPictures(targetR2, options.targetBucket, verifiedKeys);
		if (pictureErrors.length)
			throw new Error(`Migration verification failed:\n${pictureErrors.join('\n')}`);
		log(
			options.dryRun
				? 'Verification passed (DB transaction; R2 source checks for planned copies).'
				: 'Verification passed (target pictures checked).'
		);
		await client.query(options.dryRun ? 'ROLLBACK' : 'COMMIT');
		inTransaction = false;
		report.print();
		log(
			options.dryRun
				? 'Dry run complete — all DB changes rolled back; no R2 writes.'
				: 'Migration committed and verified.'
		);
	} catch (err) {
		if (inTransaction) await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}
