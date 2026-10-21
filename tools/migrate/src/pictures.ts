// Step 3: copy event pictures from the legacy R2 bucket to the target bucket.
// Keys are kept as-is (pictures/<name>), matching the URLs migrate.ts wrote
// into events.picture. Idempotent: safe objects already in the target are skipped;
// the legacy bucket is only ever read.
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { legacyPool, requireEnv } from './db';
import { copyLegacyPicture } from './picture-copy';
import { hasLegacyPicture } from './picture-policy';

// --wipe-target deletes every object in the target bucket before copying, so
// the bucket converges to exactly the legacy pictures (drops orphaned dev
// uploads). npm swallows the flag when the `--` separator is forgotten but
// records it as npm_config_wipe_target, so honor both.
const wipeTarget =
	process.argv.includes('--wipe-target') || process.env.npm_config_wipe_target === 'true';

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

async function emptyBucket(client: S3Client, bucket: string): Promise<number> {
	let deleted = 0;
	let token: string | undefined;
	do {
		const page = await client.send(
			new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
		);
		const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
		if (keys.length > 0) {
			await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
			deleted += keys.length;
		}
		token = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (token);
	return deleted;
}

async function main() {
	const legacyBucket = requireEnv('LEGACY_R2_BUCKET_NAME');
	const targetBucket = targetEnv('BUCKET_NAME');
	const legacyR2 = r2Client('LEGACY');
	const targetR2 = r2Client('TARGET');

	if (wipeTarget) {
		// Paranoia guard: never wipe the bucket we are about to read from.
		if (targetBucket === legacyBucket) {
			console.error(`Refusing --wipe-target: target and legacy bucket are both "${targetBucket}".`);
			process.exit(1);
		}
		const deleted = await emptyBucket(targetR2, targetBucket);
		console.log(`Wiped target bucket "${targetBucket}": ${deleted} object(s) deleted.`);
	}

	const legacy = legacyPool();
	const { rows } = await legacy.query<{ id: string; name: string; picture: string }>(
		`SELECT id, name, picture FROM events WHERE picture IS NOT NULL ORDER BY id`
	);
	await legacy.end();
	// Use exactly the URL mapper's JS whitespace rule, including tabs/newlines.
	const pictures = rows.filter(({ picture }) => hasLegacyPicture(picture));
	console.log(`${pictures.length} event picture(s) to check…`);

	let copied = 0;
	let skipped = 0;
	const missing: string[] = [];
	const rejected: string[] = [];

	for (const { name, picture: key } of pictures) {
		const result = await copyLegacyPicture(legacyR2, targetR2, legacyBucket, targetBucket, key);
		if (result.status === 'present') {
			skipped++;
			continue;
		}
		if (result.status === 'missing') {
			missing.push(`${key} (event "${name}")`);
			continue;
		}
		if (result.status === 'rejected') {
			rejected.push(
				`${JSON.stringify(key)} (event ${JSON.stringify(name)}): ${result.bucket} Content-Type ${JSON.stringify(result.contentType ?? '(missing)')}`
			);
			continue;
		}
		copied++;
		console.log(`  copied ${key} (${(result.bytes / 1024).toFixed(0)} KiB)`);
	}

	console.log(
		`\nDone: ${copied} copied, ${skipped} already present, ${missing.length} missing in legacy bucket, ${rejected.length} rejected by content type.`
	);
	for (const m of missing) console.log(`  ⚠ missing: ${m}`);
	for (const r of rejected) console.log(`  ⚠ rejected: ${r}`);
	if (missing.length > 0 || rejected.length > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
