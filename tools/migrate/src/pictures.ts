// Step 3: copy event pictures from the legacy R2 bucket to the target bucket.
// Keys are kept as-is (pictures/<name>), matching the URLs migrate.ts wrote
// into events.picture. Idempotent: objects already in the target are skipped;
// the legacy bucket is only ever read.
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	HeadObjectCommand
} from '@aws-sdk/client-s3';
import { legacyPool, requireEnv } from './db';

// TARGET_* falls back to the app's own R2_* names (see src/lib/server/r2.ts)
// so the tool can run inside the deployed app container without extra config.
function targetEnv(suffix: string): string {
	return requireEnv(`TARGET_R2_${suffix}`, `R2_${suffix}`);
}

function r2Client(prefix: 'LEGACY' | 'TARGET'): S3Client {
	const env = (suffix: string) =>
		prefix === 'TARGET' ? targetEnv(suffix) : requireEnv(`LEGACY_R2_${suffix}`);
	return new S3Client({
		region: 'auto',
		endpoint: `https://${env('ACCOUNT_ID')}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env('ACCESS_KEY_ID'),
			secretAccessKey: env('SECRET_ACCESS_KEY')
		}
	});
}

async function exists(client: S3Client, bucket: string, key: string): Promise<boolean> {
	try {
		await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
		return true;
	} catch (err) {
		if (err instanceof Error && err.name === 'NotFound') return false;
		throw err;
	}
}

async function main() {
	const legacyBucket = requireEnv('LEGACY_R2_BUCKET_NAME');
	const targetBucket = targetEnv('BUCKET_NAME');
	const legacyR2 = r2Client('LEGACY');
	const targetR2 = r2Client('TARGET');

	const legacy = legacyPool();
	const { rows } = await legacy.query<{ id: string; name: string; picture: string }>(
		`SELECT id, name, picture FROM events WHERE picture IS NOT NULL AND btrim(picture) <> '' ORDER BY id`
	);
	await legacy.end();
	console.log(`${rows.length} event picture(s) to check…`);

	let copied = 0;
	let skipped = 0;
	const missing: string[] = [];

	for (const { name, picture: key } of rows) {
		if (await exists(targetR2, targetBucket, key)) {
			skipped++;
			continue;
		}
		let source;
		try {
			source = await legacyR2.send(new GetObjectCommand({ Bucket: legacyBucket, Key: key }));
		} catch (err) {
			if (err instanceof Error && (err.name === 'NoSuchKey' || err.name === 'NotFound')) {
				missing.push(`${key} (event "${name}")`);
				continue;
			}
			throw err;
		}
		const body = await source.Body!.transformToByteArray();
		await targetR2.send(
			new PutObjectCommand({
				Bucket: targetBucket,
				Key: key,
				Body: body,
				ContentType: source.ContentType,
				CacheControl: 'public, max-age=31536000'
			})
		);
		copied++;
		console.log(`  copied ${key} (${(body.length / 1024).toFixed(0)} KiB)`);
	}

	console.log(
		`\nDone: ${copied} copied, ${skipped} already present, ${missing.length} missing in legacy bucket.`
	);
	for (const m of missing) console.log(`  ⚠ missing: ${m}`);
	if (missing.length > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
