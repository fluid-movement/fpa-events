import { defineConfig } from 'drizzle-kit';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Find the local D1 database file
// Wrangler creates the database with a hash-based filename
function getLocalDbPath(): string {
	const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

	if (!existsSync(d1Dir)) {
		console.warn('No local D1 database found. Run "bun run dev" first to create it.');
		// Return a placeholder path
		return './.wrangler/state/v3/d1/db.sqlite';
	}

	try {
		const files = readdirSync(d1Dir);
		const dbFile = files.find((f) => f.endsWith('.sqlite'));

		if (!dbFile) {
			console.warn('No .sqlite file found in local D1 directory.');
			return './.wrangler/state/v3/d1/db.sqlite';
		}

		return join(d1Dir, dbFile);
	} catch (error) {
		console.error('Error reading local D1 directory:', error);
		return './.wrangler/state/v3/d1/db.sqlite';
	}
}

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',

	// Use turso driver with local file URL for Drizzle Studio
	// This allows Drizzle Studio to connect to your local D1 database
	dbCredentials: {
		url: 'file:' + getLocalDbPath()
	},

	verbose: true,
	strict: true
});
