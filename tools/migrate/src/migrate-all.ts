// The only executable migration entry point. Importable internals never prompt or connect.
import { createInterface } from 'node:readline/promises';
import { S3Client } from '@aws-sdk/client-s3';
import { legacyPool, targetPool, requireEnv } from './db';
import { loadLocationMap, saveLocationMap } from './locations';
import { migrateAll } from './orchestrate';

function r2Client(prefix: 'LEGACY' | 'TARGET'): S3Client {
	const env = (suffix: string) =>
		prefix === 'TARGET'
			? requireEnv(`TARGET_R2_${suffix}`, `R2_${suffix}`)
			: requireEnv(`LEGACY_R2_${suffix}`);
	return new S3Client({
		region: 'auto',
		endpoint: `https://${env('ACCOUNT_ID')}.r2.cloudflarestorage.com`,
		credentials: { accessKeyId: env('ACCESS_KEY_ID'), secretAccessKey: env('SECRET_ACCESS_KEY') }
	});
}

async function main() {
	if (process.argv.slice(2).some((arg) => arg !== '--dry-run'))
		throw new Error('Usage: npm run migrate:all -- [--dry-run]');
	const options = {
		dryRun: process.argv.includes('--dry-run') || process.env.npm_config_dry_run === 'true',
		legacyDatabaseUrl: requireEnv('LEGACY_DATABASE_URL'),
		targetDatabaseUrl: requireEnv('TARGET_DATABASE_URL', 'DATABASE_URL'),
		legacyBucket: requireEnv('LEGACY_R2_BUCKET_NAME'),
		targetBucket: requireEnv('TARGET_R2_BUCKET_NAME', 'R2_BUCKET_NAME'),
		publicUrl: requireEnv('TARGET_R2_PUBLIC_URL', 'R2_PUBLIC_URL')
	};
	const legacyR2 = r2Client('LEGACY');
	const targetR2 = r2Client('TARGET');
	const legacy = legacyPool();
	const target = targetPool();
	// Lazily create readline only when a prompt is needed. No env/flag can answer it.
	let terminal: ReturnType<typeof createInterface> | undefined;
	try {
		await migrateAll(options, {
			legacy,
			target,
			legacyR2,
			targetR2,
			photonFetch: fetch,
			prompt: async (question) => {
				if (!process.stdin.isTTY || !process.stdout.isTTY)
					throw new Error('Interactive terminal required; run it from the Coolify terminal.');
				terminal ??= createInterface({ input: process.stdin, output: process.stdout });
				return terminal.question(question);
			},
			loadMap: loadLocationMap,
			saveMap: saveLocationMap,
			log: console.log,
			pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
		});
	} finally {
		terminal?.close();
		legacyR2.destroy();
		targetR2.destroy();
		await Promise.all([legacy.end(), target.end()]);
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : 'Migration failed');
	process.exitCode = 1;
});
