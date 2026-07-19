import 'dotenv/config';
import pg from 'pg';

// Target-side settings fall back to the event app's own variable names, so
// when the tool runs inside the deployed app container only the LEGACY_*
// variables need to be added. Returns the first name that is set.
export function requireEnv(...names: string[]): string {
	for (const name of names) {
		const value = process.env[name];
		if (value) return value;
	}
	console.error(
		`Missing required env var: set ${names.join(' or ')} in the environment or in .env (see .env.example).`
	);
	process.exit(1);
}

export function legacyPool(): pg.Pool {
	return new pg.Pool({ connectionString: requireEnv('LEGACY_DATABASE_URL') });
}

export function targetPool(): pg.Pool {
	return new pg.Pool({ connectionString: requireEnv('TARGET_DATABASE_URL', 'DATABASE_URL') });
}
