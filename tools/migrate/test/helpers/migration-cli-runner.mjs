// Loaded only by offline CLI tests. Replace service adapters, while executing
// the real migration entry points, validators, SQL loops, reports and exits.
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const fixture = JSON.parse(readFileSync(0, 'utf8'));
const migrationRoot = new URL('../../src/', import.meta.url);
const state = {
	queries: [],
	tables: structuredClone(fixture.initialTables ?? {}),
	commands: [],
	objects: structuredClone(fixture.targetObjects ?? {})
};
let transaction;

const target = {
	async query(sql, params = []) {
		state.queries.push({ sql, params });
		if (sql === 'BEGIN') transaction = structuredClone(state.tables);
		else if (sql === 'ROLLBACK') {
			state.tables = transaction;
			transaction = undefined;
		} else if (sql === 'COMMIT') transaction = undefined;
		else {
			const deletion = /DELETE FROM "?(\w+)"?/.exec(sql);
			const insertion = /INSERT INTO "?(\w+)"?/.exec(sql);
			if (deletion) state.tables[deletion[1]] = [];
			else if (insertion) (state.tables[insertion[1]] ??= []).push(params);
			else throw new Error(`Unexpected target SQL: ${sql}`);
		}
		return { rows: [{ id: 1 }], rowCount: 1 };
	},
	release() {}
};

const legacy = {
	async query(sql) {
		const table = /FROM (\w+)/.exec(sql)?.[1];
		if (!table || !Object.hasOwn(fixture.rows, table))
			throw new Error(`Unexpected legacy SQL: ${sql}`);
		let rows = fixture.rows[table];
		if (/picture IS NOT NULL/.test(sql)) rows = rows.filter((row) => row.picture !== null);
		return { rows };
	},
	async end() {}
};

class Command {
	constructor(input) {
		this.input = input;
	}
}
class GetObjectCommand extends Command {}
class PutObjectCommand extends Command {}
class HeadObjectCommand extends Command {}
class ListObjectsV2Command extends Command {}
class DeleteObjectsCommand extends Command {}
class S3Client {
	constructor(config) {
		this.side = config.endpoint.includes('legacy-account') ? 'legacy' : 'target';
	}
	async send(command) {
		const { Key: key } = command.input;
		state.commands.push({ side: this.side, command: command.constructor.name, key });
		const objects = this.side === 'legacy' ? (fixture.legacyObjects ?? {}) : state.objects;
		const object = objects[key];
		if (command instanceof HeadObjectCommand || command instanceof GetObjectCommand) {
			if (!object) throw Object.assign(new Error('Missing fixture object'), { name: 'NotFound' });
			return {
				ContentType: object.contentType,
				Body: {
					async transformToByteArray() {
						return new Uint8Array(object.body ?? [1, 2, 3]);
					},
					destroy() {}
				}
			};
		}
		if (command instanceof PutObjectCommand && this.side === 'target') {
			objects[key] = { contentType: command.input.ContentType, body: [...command.input.Body] };
			return {};
		}
		throw new Error(`Unexpected fixture command: ${command.constructor.name}`);
	}
}

// Only fixture values are available; the real db.ts (and dotenv) never loads.
globalThis.migrationFixture = {
	legacyPool: () => legacy,
	targetPool: () => ({ connect: async () => target, end: async () => {} }),
	requireEnv: (name) => {
		if (name.endsWith('PUBLIC_URL')) return 'https://pictures.example';
		if (name.endsWith('ACCOUNT_ID'))
			return name.startsWith('LEGACY') ? 'legacy-account' : 'target-account';
		if (name.endsWith('BUCKET_NAME')) return name.startsWith('LEGACY') ? 'legacy' : 'target';
		if (name.endsWith('ACCESS_KEY_ID') || name.endsWith('SECRET_ACCESS_KEY')) return 'fixture-only';
		throw new Error(`Unexpected environment lookup: ${name}`);
	},
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	DeleteObjectsCommand
};

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (context.parentURL?.startsWith(migrationRoot.href)) {
			if (specifier === './db') return { url: 'migration-fixture:db', shortCircuit: true };
			if (specifier === './locations')
				return { url: 'migration-fixture:locations', shortCircuit: true };
			if (specifier === 'pg') return { url: 'migration-fixture:pg', shortCircuit: true };
			if (specifier === '@aws-sdk/client-s3')
				return { url: 'migration-fixture:s3', shortCircuit: true };
			if (specifier.startsWith('.')) {
				const url = new URL(`${specifier}.ts`, context.parentURL);
				if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
			}
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		const mocks = {
			'migration-fixture:db':
				'export const { legacyPool, targetPool, requireEnv } = globalThis.migrationFixture;',
			'migration-fixture:locations': 'export const loadLocationMap = () => ({});',
			'migration-fixture:pg': 'export default {};',
			'migration-fixture:s3':
				'export const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = globalThis.migrationFixture;'
		};
		if (Object.hasOwn(mocks, url))
			return { format: 'module', source: mocks[url], shortCircuit: true };
		if (url.startsWith(migrationRoot.href) && url.endsWith('.ts')) {
			return {
				format: 'module',
				source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8')),
				shortCircuit: true
			};
		}
		return nextLoad(url, context);
	}
});

// process.exit is deliberately real: tests observe the actual CLI exit code.
process.on('exit', () =>
	process.stdout.write(`\nMIGRATION_FIXTURE_STATE=${JSON.stringify(state)}\n`)
);

try {
	const entry = process.argv[2].endsWith('/pictures.ts') ? 'pictures' : 'migrate';
	if (entry === 'migrate') {
		const { importDatabase } = await import(new URL('../../src/migrate.ts', import.meta.url));
		await target.query('BEGIN');
		try {
			const report = await importDatabase(legacy, target, {}, 'https://pictures.example');
			const dryRun = process.argv.includes('--dry-run');
			await target.query(dryRun ? 'ROLLBACK' : 'COMMIT');
			if (dryRun) console.log('Dry run complete — all changes rolled back.');
			report.print();
		} catch (err) {
			await target.query('ROLLBACK');
			throw err;
		}
	} else {
		const { listPictures, copyPictures } = await import(
			new URL('../../src/pictures.ts', import.meta.url)
		);
		const pictures = await listPictures(legacy);
		console.log(`${pictures.length} event picture(s) to check…`);
		await copyPictures(
			new S3Client({ endpoint: 'legacy-account' }),
			new S3Client({ endpoint: 'target-account' }),
			'legacy',
			'target',
			pictures,
			console.log
		);
	}
} catch (err) {
	console.error(err);
	process.exitCode = 1;
}
