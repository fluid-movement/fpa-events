import { spawnSync } from 'node:child_process';
import path from 'node:path';

type LegacyRow = Record<string, string | number | null>;
type FixtureObject = { contentType?: string; body?: number[] };
export type LegacyTable = 'users' | 'events' | 'event_user' | 'event_magic_links' | 'schedules';
export type MigrationFixture = {
	rows: Record<LegacyTable, LegacyRow[]>;
	initialTables?: Record<string, unknown[][]>;
	legacyObjects?: Record<string, FixtureObject>;
	targetObjects?: Record<string, FixtureObject>;
};
type CliState = {
	queries: { sql: string; params: unknown[] }[];
	tables: Record<string, unknown[][]>;
	commands: { side: string; command: string; key?: string }[];
	objects: Record<string, FixtureObject>;
};

export const userId = '01M5A4X8WHFKD6S0QHQCDPFMPP';
export const eventId = '01M5A4X9AP5EG81X6ZCN9Q4JPJ';
const timestamp = '2026-10-21 12:00:00';

export function migrationFixture(): MigrationFixture {
	return {
		initialTables: { user: [['existing-target-user']], events: [['existing-target-event']] },
		rows: {
			users: [
				{
					id: userId,
					name: 'Legacy user',
					email: 'Someone@Example.org',
					password: '$2y$legacy-hash',
					role: 'user',
					created_at: timestamp,
					updated_at: timestamp
				}
			],
			events: [
				{
					id: eventId,
					user_id: userId,
					name: 'Legacy event',
					start_date: timestamp,
					end_date: timestamp,
					location: '',
					description: '',
					picture: null,
					picture_width: null,
					picture_height: null,
					created_at: timestamp,
					updated_at: timestamp
				}
			],
			event_user: [
				{
					event_id: eventId,
					user_id: userId,
					status: 'organizing',
					created_at: timestamp,
					updated_at: timestamp
				}
			],
			event_magic_links: [
				{
					id: '01M5A4X8ZCM3JDSD66MKD07F34',
					event_id: eventId,
					expires_at: timestamp,
					created_at: timestamp,
					updated_at: timestamp
				}
			],
			schedules: [
				{
					id: '01M5A7A6MS1NSH8EMQ2QRC9WNS',
					event_id: eventId,
					name: 'Legacy schedule',
					start_date: timestamp,
					end_date: timestamp,
					description: null,
					location: null,
					latitude: null,
					longitude: null,
					created_at: timestamp,
					updated_at: timestamp
				}
			]
		}
	};
}

/** Execute the real CLI source; only DB and bucket adapters are substituted. */
export function runMigrationCli(
	entry: 'migrate' | 'pictures',
	fixture: MigrationFixture,
	args: string[] = []
) {
	const runner = path.resolve('test/helpers/migration-cli-runner.mjs');
	const source = path.resolve(`src/${entry}.ts`);
	const result = spawnSync(process.execPath, [runner, source, ...args], {
		input: JSON.stringify(fixture),
		encoding: 'utf8',
		// Never inherit database/bucket credentials or load a real .env file.
		env: { NODE_NO_WARNINGS: '1' },
		timeout: 10000,
		maxBuffer: 1024 * 1024
	});
	if (result.error) throw result.error;
	const match = /^MIGRATION_FIXTURE_STATE=(.+)$/m.exec(result.stdout);
	if (!match) throw new Error(`CLI fixture did not return state: ${result.stderr}`);
	return {
		status: result.status,
		stdout: result.stdout.slice(0, match.index),
		stderr: result.stderr,
		state: JSON.parse(match[1]) as CliState
	};
}
