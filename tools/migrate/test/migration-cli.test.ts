import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { offline } from './helpers/offline';

type Services = ReturnType<typeof offline>;
type CliFixture = {
	state?: Partial<Services['state']>;
	fixture?: Services['fixture'];
	sourceObjects?: Services['sourceObjects'];
	stdinTTY?: boolean;
	stdoutTTY?: boolean;
};

const environment: Record<string, string> = {
	NODE_NO_WARNINGS: '1',
	NO_COLOR: '1',
	LEGACY_DATABASE_URL: 'postgres://readonly:fixture@legacy-host/legacy_dump',
	TARGET_DATABASE_URL: 'postgres://writer:fixture@target-host/migrated',
	LEGACY_R2_ACCOUNT_ID: 'legacy-account',
	LEGACY_R2_ACCESS_KEY_ID: 'fixture',
	LEGACY_R2_SECRET_ACCESS_KEY: 'fixture',
	LEGACY_R2_BUCKET_NAME: 'legacy',
	TARGET_R2_ACCOUNT_ID: 'target-account',
	TARGET_R2_ACCESS_KEY_ID: 'fixture',
	TARGET_R2_SECRET_ACCESS_KEY: 'fixture',
	TARGET_R2_BUCKET_NAME: 'target',
	TARGET_R2_PUBLIC_URL: 'https://pictures.example'
};

function cli(
	fixture: CliFixture = {},
	args: string[] = [],
	env: Record<string, string | undefined> = {}
) {
	const result = spawnSync(
		process.execPath,
		[
			'--import',
			'tsx',
			'--import',
			'./test/helpers/all-cli-services.mjs',
			'src/migrate-all.ts',
			...args
		],
		{
			input: JSON.stringify(fixture),
			// No inherited credentials, dotenv, real adapters, or network operations.
			env: { ...environment, ...env },
			encoding: 'utf8',
			timeout: 10000,
			maxBuffer: 1024 * 1024
		}
	);
	if (result.error) throw result.error;
	const match = /^MIGRATION_ALL_STATE=(.+)$/m.exec(result.stdout);
	if (!match) throw new Error(`Actual CLI did not expose offline state: ${result.stderr}`);
	return { ...result, state: JSON.parse(match[1]) as Services['state'] & { lifecycle: string[] } };
}

function noTargetChanges(result: ReturnType<typeof cli>) {
	expect(result.state.tables).toEqual(offline().fixture.initialTables);
	expect(result.state.objects).toEqual(offline().state.objects);
	expect(
		result.state.commands.some((c) => ['DeleteObjectsCommand', 'PutObjectCommand'].includes(c.name))
	).toBe(false);
	expect(result.state.queries).not.toContain('COMMIT');
}

describe('actual migrate-all.ts process and failure exit status', () => {
	it('executes the production entry point through successful verification and cleanup', () => {
		const result = cli();
		expect(result.status, result.stderr).toBe(0);
		expect(result.state.queries.at(-1)).toBe('COMMIT');
		expect(result.state.objects).toEqual({
			'pictures/legacy.png': { contentType: 'image/png', body: [4, 5, 6] }
		});
		expect(result.state.prompts).toHaveLength(1);
		expect(result.state.lifecycle).toEqual(
			expect.arrayContaining([
				'terminal.close',
				'legacy.end',
				'target.end',
				'legacyR2.destroy',
				'targetR2.destroy'
			])
		);
	});

	it.each([
		'user',
		'account',
		'events',
		'event_user',
		'event_magic_links',
		'schedules',
		'event_locations',
		'schedule_locations'
	])('exits 1 on an actual stored %s count mismatch without modifying the bucket', (table) => {
		const result = cli({ state: { countOverrides: { [table]: 999 } } });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('Migration verification failed');
		expect(result.stderr).toContain(`${table === 'user' ? '"user"' : table}: expected`);
		expect(result.state.queries.at(-1)).toBe('ROLLBACK');
		noTargetChanges(result);
	});

	it.each(['danglingEvents', 'danglingVenues'] as const)(
		'exits 1 for missing location references (%s)',
		(kind) => {
			const result = cli({ state: { [kind]: 1 } });
			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr).toContain('point to a missing location');
			noTargetChanges(result);
		}
	);

	it('exits 1 for browser-unresolvable stored picture URLs before the bucket wipe', () => {
		const result = cli({
			state: { pictureUrlOverride: 'https://pictures.example/pictures/wrong.png#fragment' }
		});
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('Event picture URLs differ');
		noTargetChanges(result);
	});

	it.each([
		['missing target picture', { omitCopy: true }, 'Missing picture'],
		['disallowed target picture', { corruptCopy: true }, 'Disallowed picture']
	] as const)('exits 1 after final picture verification rejects %s', (_name, state, message) => {
		const result = cli({ state });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('Migration verification failed');
		expect(result.stderr).toContain(message);
		expect(result.state.queries.at(-1)).toBe('ROLLBACK');
		expect(result.state.queries).not.toContain('COMMIT');
	});

	it.each(['--dry-run', 'npm_config_dry_run'])(
		'allows a prompt-free dry run through %s without a TTY',
		(source) => {
			const result = cli(
				{ stdinTTY: false, stdoutTTY: false },
				source === '--dry-run' ? ['--dry-run'] : [],
				source === 'npm_config_dry_run' ? { npm_config_dry_run: 'true' } : {}
			);
			expect(result.status, result.stderr).toBe(0);
			expect(result.state.prompts).toEqual([]);
			expect(result.state.queries.at(-1)).toBe('ROLLBACK');
			noTargetChanges(result);
		}
	);

	it.each(['stdinTTY', 'stdoutTTY'] as const)(
		'refuses a real run without %s regardless of env confirmation attempts',
		(terminal) => {
			const result = cli({ [terminal]: false }, [], {
				CONFIRM: 'migrated',
				TARGET_DATABASE_NAME: 'migrated',
				CI: 'true'
			});
			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr).toContain('Interactive terminal required');
			expect(result.state.prompts).toEqual([]);
			noTargetChanges(result);
		}
	);

	it('rejects a wrong typed name without accepting an env confirmation', () => {
		const result = cli({ state: { answers: ['wrong'] } }, [], { CONFIRM: 'migrated' });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('confirmation did not match');
		noTargetChanges(result);
	});

	it.each(['--yes', '--confirm=migrated', '--wipe-target', '--dry-run=false'])(
		'rejects unsupported CLI flag %s',
		(arg) => {
			const result = cli({}, [arg]);
			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr).toContain('Usage: npm run migrate:all');
			expect(result.state.queries).toEqual([]);
			noTargetChanges(result);
		}
	);

	it.each(Object.keys(environment).filter((key) => /^(LEGACY_|TARGET_)/.test(key)))(
		'requires runtime environment setting %s',
		(key) => {
			const result = cli({}, [], { [key]: undefined });
			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr).toContain('Missing required env var');
			expect(result.stderr).toContain(key);
			noTargetChanges(result);
		}
	);

	it('honors the app environment fallbacks without bypassing confirmation', () => {
		const env: Record<string, string | undefined> = {};
		for (const [name, value] of Object.entries(environment)) {
			if (!name.startsWith('TARGET_')) continue;
			env[name] = undefined;
			env[name.slice('TARGET_'.length)] = value;
		}
		const result = cli({}, [], env);
		expect(result.status, result.stderr).toBe(0);
		expect(result.state.prompts).toHaveLength(1);
	});

	it('refuses a connected DB name that differs from configuration before prompting or deleting', () => {
		const result = cli({ state: { connectedDatabase: 'unexpected' } });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('Connected target database does not match');
		expect(result.state.prompts).toEqual([]);
		noTargetChanges(result);
	});

	it.each([
		{ TARGET_DATABASE_URL: environment.LEGACY_DATABASE_URL },
		{ TARGET_R2_BUCKET_NAME: environment.LEGACY_R2_BUCKET_NAME }
	])('refuses shared targets configured through the real CLI environment (%j)', (env) => {
		const result = cli({}, [], env);
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('Refusing');
		expect(result.state.queries).toEqual([]);
		noTargetChanges(result);
	});

	it('requires separate explicit mapping approval and the exact DB name with real CLI prompts', () => {
		const fixture = offline().fixture;
		fixture.rows.events[0].location = 'Berlin';
		const result = cli({ fixture, state: { answers: ['yes', 'migrated'] } });
		expect(result.status, result.stderr).toBe(0);
		expect(result.state.prompts).toHaveLength(2);
		expect(result.state.saved?.Berlin).toMatchObject({ city: 'Berlin' });
		expect(result.state.queries.at(-1)).toBe('COMMIT');
	});

	it('persists new geocodes but exits 1 on explicit no before target changes', () => {
		const fixture = offline().fixture;
		fixture.rows.events[0].location = 'Berlin';
		const result = cli({ fixture, state: { answers: ['no'] } });
		expect(result.status, result.stderr).toBe(1);
		expect(result.stderr).toContain('mapping file saved');
		expect(result.state.saved?.Berlin).toMatchObject({ city: 'Berlin' });
		expect(result.state.queries).toEqual([]);
		noTargetChanges(result);
	});
});
