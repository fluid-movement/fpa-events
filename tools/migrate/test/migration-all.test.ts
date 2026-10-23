import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrateAll } from '../src/orchestrate';
import { offline } from './helpers/offline';

afterEach(() => vi.restoreAllMocks());

function scenario() {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	const f = offline();
	f.fixture.rows.events[0].picture = 'pictures/legacy.png';
	f.sourceObjects['pictures/legacy.png'] = { contentType: 'image/png', body: [4, 5, 6] };
	return { ...f, run: () => migrateAll(f.options, f.adapters) };
}

const writes = (f: ReturnType<typeof scenario>) =>
	f.state.commands.filter((c) => ['PutObjectCommand', 'DeleteObjectsCommand'].includes(c.name));

describe('one-command migration safety and verification', () => {
	it('requires the typed DB name and aborts before any deletion when it differs', async () => {
		const f = scenario();
		const initial = structuredClone(f.state);
		f.state.answers = ['wrong-name'];
		await expect(f.run()).rejects.toThrow('confirmation did not match');
		expect(f.state.tables).toEqual(initial.tables);
		expect(f.state.objects).toEqual(initial.objects);
		expect(f.state.queries).toEqual(['SELECT current_database() AS name']);
		expect(writes(f)).toEqual([]);
		expect(f.state.logs.join('\n')).toContain(
			'host: target-host:5432; database: migrated; R2 bucket: target'
		);
		expect(f.state.logs.join('\n')).not.toContain('secret');
		expect(f.state.released).toBe(true);
	});

	it('dry-run rolls back DB rows, leaves all R2 objects intact and asks no questions', async () => {
		const f = scenario();
		f.options.dryRun = true;
		f.fixture.rows.events[0].location = 'Berlin';
		const originalTables = structuredClone(f.state.tables);
		const originalObjects = structuredClone(f.state.objects);
		await f.run();
		expect(f.state.tables).toEqual(originalTables);
		expect(f.state.objects).toEqual(originalObjects);
		expect(writes(f)).toEqual([]);
		expect(f.state.prompts).toEqual([]);
		expect(f.state.queries.at(-1)).toBe('ROLLBACK');
		expect(f.state.queries).not.toContain('COMMIT');
		expect(f.state.logs.join('\n')).toContain('Would delete R2 "orphan/dev.png"');
		expect(f.state.logs.join('\n')).toContain('Would copy R2 "pictures/legacy.png"');
		expect(f.state.logs.join('\n')).toContain('R2 source checks for planned copies');
		expect(f.state.saved?.Berlin).toMatchObject({ city: 'Berlin', latitude: 52.5 });
	});

	it('saves and prints new geocodes before pausing; no leaves targets untouched', async () => {
		const f = scenario();
		f.fixture.rows.events[0].location = 'Berlin';
		f.state.answers = ['no'];
		const initial = structuredClone(f.state.tables);
		await expect(f.run()).rejects.toThrow('mapping file saved');
		expect(f.state.saved?.Berlin).toEqual({
			city: 'Berlin',
			country: 'Germany',
			latitude: 52.5,
			longitude: 13.4
		});
		expect(f.state.logs.join('\n')).toContain('"latitude":52.5');
		expect(f.state.prompts).toHaveLength(1);
		expect(f.state.queries).toEqual([]);
		expect(f.state.tables).toEqual(initial);
		expect(writes(f)).toEqual([]);
	});

	it('preserves reviewed mappings (including null), queries only missing strings and accepts explicit yes', async () => {
		const f = scenario();
		f.fixture.rows.events[0].location = 'Berlin';
		f.state.map = {
			Reviewed: null,
			Paris: { city: 'Paris', country: 'France', latitude: 48.8, longitude: 2.3 }
		};
		f.fixture.rows.events.push({
			...f.fixture.rows.events[0],
			id: '01M5A4X9AP5EG81X6ZCN9Q4JPK',
			location: 'Reviewed',
			picture: null
		});
		f.state.answers = ['yes', 'migrated'];
		await f.run();
		expect(f.state.photonCalls).toHaveLength(1);
		expect(new URL(f.state.photonCalls[0]).searchParams.get('q')).toBe('Berlin');
		expect(f.state.saved?.Reviewed).toBeNull();
		expect(f.state.saved?.Paris).toEqual(f.state.map.Paris);
		expect(f.state.prompts).toHaveLength(2);
		expect(f.state.tables.events[0][6]).toBe(1);
		expect(f.state.tables.events[1][6]).toBeNull();
		expect(f.state.queries.at(-1)).toBe('COMMIT');
	});

	it('wipes every object across paginated listings, imports canonical users and verifies copied bytes/types', async () => {
		const f = scenario();
		f.state.objects['outside-pictures/another-orphan'] = { contentType: 'text/html' };
		await f.run();
		expect(f.state.objects).toEqual({
			'pictures/legacy.png': { contentType: 'image/png', body: [4, 5, 6] }
		});
		expect(f.state.tables.user[0][2]).toBe('someone@example.org');
		expect(f.state.tables.account[0][2]).toBe('$2y$legacy-hash');
		expect(f.state.queries.at(-1)).toBe('COMMIT');
		expect(f.state.logs.join('\n')).toContain('Verification passed');
		expect(writes(f).filter((c) => c.name === 'DeleteObjectsCommand')).toHaveLength(2);
	});

	it('rolls back without touching R2 when email collisions are found', async () => {
		const f = scenario();
		f.fixture.rows.users.push({
			...f.fixture.rows.users[0],
			id: '01M5A4X9AP5EG81X6ZCN9Q4JPK',
			email: ' someone@example.org '
		});
		await expect(f.run()).rejects.toThrow('Legacy email collisions');
		expect(f.state.tables).toEqual(f.fixture.initialTables);
		expect(writes(f)).toEqual([]);
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
	])(
		'DB verification failure leaves the original bucket untouched on a %s count mismatch',
		async (table) => {
			const f = scenario();
			const originalBucket = structuredClone(f.state.objects);
			f.state.countOverrides[table] = 999;
			await expect(f.run()).rejects.toThrow(`${table === 'user' ? '"user"' : table}: expected`);
			expect(f.state.queries).not.toContain('COMMIT');
			expect(f.state.tables).toEqual(f.fixture.initialTables);
			expect(f.state.objects).toEqual(originalBucket);
			expect(writes(f)).toEqual([]);
		}
	);

	it('checks effective account/RSVP/location counts while showing raw source counts', async () => {
		const f = scenario();
		f.fixture.rows.users[0].password = null;
		f.fixture.rows.event_user.push({ ...f.fixture.rows.event_user[0] });
		f.fixture.rows.schedules[0].location = ' Main hall ';
		await f.run();
		expect(f.state.tables.account).toEqual([]);
		expect(f.state.tables.event_user).toHaveLength(1);
		expect(f.state.tables.schedule_locations).toHaveLength(1);
		expect(f.state.logs).toContain('account: 1 / 0 / 0');
		expect(f.state.logs).toContain('event_user: 2 / 1 / 1');
	});

	it.each(['danglingEvents', 'danglingVenues'] as const)(
		'rejects a dangling reference (%s)',
		async (kind) => {
			const f = scenario();
			f.state[kind] = 1;
			await expect(f.run()).rejects.toThrow('point to a missing location');
			expect(f.state.tables).toEqual(f.fixture.initialTables);
			expect(f.state.queries).not.toContain('COMMIT');
		}
	);

	it.each([undefined, 'text/html', 'image/svg+xml', 'Image/JPEG', 'image/jpeg; charset=binary'])(
		'aborts before deletion on unsafe source type %j',
		async (contentType) => {
			const f = scenario();
			f.sourceObjects['pictures/legacy.png'].contentType = contentType;
			await expect(f.run()).rejects.toThrow('Disallowed picture');
			expect(writes(f)).toEqual([]);
			expect(f.state.tables).toEqual(f.fixture.initialTables);
		}
	);

	it('rejects missing pictures even on a dry run', async () => {
		const f = scenario();
		f.options.dryRun = true;
		delete f.sourceObjects['pictures/legacy.png'];
		await expect(f.run()).rejects.toThrow('Missing picture');
		expect(writes(f)).toEqual([]);
	});

	it('verifies the target object type after copying, rather than trusting PUT success', async () => {
		const f = scenario();
		f.state.corruptCopy = true;
		await expect(f.run()).rejects.toThrow('Migration verification failed');
		expect(f.state.queries).not.toContain('COMMIT');
		expect(f.state.tables).toEqual(f.fixture.initialTables);
	});

	it('fails final verification when a successful copy leaves a missing target picture', async () => {
		const f = scenario();
		f.state.omitCopy = true;
		await expect(f.run()).rejects.toThrow('Missing picture');
		expect(f.state.queries).not.toContain('COMMIT');
		expect(f.state.tables).toEqual(f.fixture.initialTables);
	});

	it('rejects stored picture URLs that differ from their legacy mappings', async () => {
		const f = scenario();
		f.state.pictureUrlOverride = 'https://untrusted.example/legacy.png';
		await expect(f.run()).rejects.toThrow('Event picture URLs differ');
		expect(f.state.queries).not.toContain('COMMIT');
		expect(writes(f)).toEqual([]);
	});

	it('treats per-object R2 deletion errors as fatal', async () => {
		const f = scenario();
		f.state.deleteError = true;
		await expect(f.run()).rejects.toThrow('R2 deletion failed');
		expect(f.state.queries.at(-1)).toBe('ROLLBACK');
		expect(f.state.commands.some((c) => c.name === 'PutObjectCommand')).toBe(false);
	});

	it.each(['database', 'bucket'])(
		'refuses a shared legacy/target %s before service operations',
		async (kind) => {
			const f = scenario();
			if (kind === 'database') f.options.targetDatabaseUrl = f.options.legacyDatabaseUrl;
			else f.options.targetBucket = f.options.legacyBucket;
			await expect(f.run()).rejects.toThrow('Refusing');
			expect(f.state.queries).toEqual([]);
			expect(f.state.commands).toEqual([]);
		}
	);
});
