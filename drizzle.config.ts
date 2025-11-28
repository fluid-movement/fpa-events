import { defineConfig } from 'drizzle-kit';

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
	throw new Error(
		'Missing required environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set'
	);
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/migrations',
	dialect: 'turso',
	dbCredentials: {
		url: TURSO_DATABASE_URL,
		authToken: TURSO_AUTH_TOKEN
	},
	verbose: true,
	strict: true
});
