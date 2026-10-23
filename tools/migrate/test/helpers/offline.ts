import type pg from 'pg';
import type { S3Client } from '@aws-sdk/client-s3';
import type { LocationMap } from '../../src/locations';
import type { MigrationAdapters, MigrationOptions } from '../../src/orchestrate';
import { migrationFixture } from './migration-cli';

type StoredObject = { contentType?: string; body?: number[] };
type StoredTables = Record<string, unknown[][]>;
type Command = {
	constructor: { name: string };
	input: {
		Key?: string;
		Bucket: string;
		Body?: Uint8Array;
		ContentType?: string;
		ContinuationToken?: string;
		Delete?: { Objects: { Key: string }[] };
	};
};

/** Stateful offline adapters: forbidden/unrecognised SQL or R2 commands throw. */
export function offline() {
	const fixture = migrationFixture();
	const state = {
		tables: structuredClone(fixture.initialTables!) as StoredTables,
		objects: { 'orphan/dev.png': { contentType: 'image/png', body: [9] } } as Record<
			string,
			StoredObject
		>,
		queries: [] as string[],
		connectedDatabase: 'migrated',
		commands: [] as { side: string; name: string; key?: string }[],
		logs: [] as string[],
		answers: ['migrated'],
		prompts: [] as string[],
		map: {} as LocationMap,
		saved: undefined as LocationMap | undefined,
		countOverrides: {} as Record<string, number>,
		danglingEvents: 0,
		danglingVenues: 0,
		deleteError: false,
		corruptCopy: false,
		omitCopy: false,
		pictureUrlOverride: undefined as string | undefined,
		photonCalls: [] as string[],
		released: false,
		pauses: [] as number[]
	};
	const sourceObjects: Record<string, StoredObject> = {};
	let snapshot: StoredTables | undefined;
	const targetQuery = async (sql: string, params: unknown[] = []) => {
		state.queries.push(sql);
		if (sql === 'SELECT current_database() AS name')
			return { rows: [{ name: state.connectedDatabase }] };
		if (sql === 'BEGIN') snapshot = structuredClone(state.tables);
		else if (sql === 'ROLLBACK') {
			state.tables = snapshot!;
			snapshot = undefined;
		} else if (sql === 'COMMIT') snapshot = undefined;
		else if (sql.includes('LEFT JOIN event_locations'))
			return { rows: [{ count: state.danglingEvents }] };
		else if (sql.includes('LEFT JOIN schedule_locations'))
			return { rows: [{ count: state.danglingVenues }] };
		else if (sql === 'SELECT id, picture FROM events') {
			return {
				rows: (state.tables.events ?? []).map((r) => ({
					id: r[0],
					picture: state.pictureUrlOverride ?? r[8]
				}))
			};
		} else {
			const table = /(?:FROM|INTO) "?(\w+)"?/.exec(sql)?.[1];
			if (!table) throw new Error(`Unexpected target SQL: ${sql}`);
			if (sql.startsWith('SELECT count(*)'))
				return {
					rows: [{ count: state.countOverrides[table] ?? state.tables[table]?.length ?? 0 }]
				};
			if (sql.startsWith('DELETE FROM')) state.tables[table] = [];
			else if (sql.startsWith('INSERT INTO')) {
				if (
					table === 'event_user' &&
					state.tables[table]?.some((r) => r[0] === params[0] && r[1] === params[1])
				)
					return { rows: [], rowCount: 0 };
				(state.tables[table] ??= []).push(params);
			} else throw new Error(`Unexpected target SQL: ${sql}`);
			return { rows: [{ id: state.tables[table].length }], rowCount: 1 };
		}
		return { rows: [], rowCount: 0 };
	};
	const legacyQuery = async (sql: string) => {
		const table = /FROM (users|events|event_user|event_magic_links|schedules)/.exec(
			sql
		)?.[1] as keyof typeof fixture.rows;
		if (!table) throw new Error(`Unexpected legacy SQL: ${sql}`);
		let rows = fixture.rows[table];
		if (sql.includes('WHERE password'))
			rows = rows.filter((r) => r.password !== null && r.password !== '');
		if (sql.includes('AS unique_rsvps'))
			rows = [...new Map(rows.map((r) => [`${r.event_id}|${r.user_id}`, r])).values()];
		if (sql.startsWith('SELECT count(*)')) return { rows: [{ count: rows.length }] };
		if (sql.includes('SELECT DISTINCT location'))
			return {
				rows: [
					...new Set(rows.map((r) => r.location).filter((v) => typeof v === 'string' && v.trim()))
				].map((location) => ({ location }))
			};
		return { rows };
	};
	function bucket(side: 'legacy' | 'target'): S3Client {
		let listedKeys: string[] = [];
		return {
			send: async (command: Command) => {
				const { Key: key, Bucket: name } = command.input;
				if (name !== side) throw new Error(`Unexpected bucket ${name}`);
				const objects = side === 'legacy' ? sourceObjects : state.objects;
				const operation = command.constructor.name;
				state.commands.push({ side, name: operation, key });
				if (['HeadObjectCommand', 'GetObjectCommand'].includes(operation)) {
					const object = objects[key!];
					if (!object) throw Object.assign(new Error('missing'), { name: 'NotFound' });
					return {
						ContentType: object.contentType,
						Body: {
							transformToByteArray: async () => new Uint8Array(object.body ?? [1]),
							destroy() {}
						}
					};
				}
				if (side === 'legacy') throw new Error('Attempted legacy bucket write');
				if (operation === 'ListObjectsV2Command') {
					if (!command.input.ContinuationToken) listedKeys = Object.keys(objects);
					const index = Number(command.input.ContinuationToken ?? 0);
					return {
						Contents: listedKeys.slice(index, index + 1).map((Key) => ({ Key })),
						IsTruncated: index + 1 < listedKeys.length,
						NextContinuationToken: String(index + 1)
					};
				}
				if (operation === 'DeleteObjectsCommand') {
					if (state.deleteError)
						return { Errors: [{ Key: 'orphan/dev.png', Code: 'AccessDenied' }] };
					for (const item of command.input.Delete!.Objects) delete objects[item.Key];
					return {};
				}
				if (operation === 'PutObjectCommand') {
					if (state.omitCopy) return {};
					objects[key!] = {
						contentType: state.corruptCopy ? 'text/html' : command.input.ContentType,
						body: [...command.input.Body!]
					};
					return {};
				}
				throw new Error(`Unexpected R2 command ${operation}`);
			}
		} as unknown as S3Client;
	}
	const options: MigrationOptions = {
		dryRun: false,
		legacyDatabaseUrl: 'postgres://readonly:secret@legacy-host/legacy_dump',
		targetDatabaseUrl: 'postgres://writer:secret@target-host/migrated',
		legacyBucket: 'legacy',
		targetBucket: 'target',
		publicUrl: 'https://pictures.example'
	};
	const adapters: MigrationAdapters = {
		legacy: { query: legacyQuery } as unknown as pg.Pool,
		target: {
			connect: async () => ({
				query: targetQuery,
				release: () => {
					state.released = true;
				}
			})
		} as unknown as pg.Pool,
		legacyR2: bucket('legacy'),
		targetR2: bucket('target'),
		loadMap: () => structuredClone(state.map),
		saveMap: (map) => {
			state.saved = structuredClone(map);
		},
		log: (message) => state.logs.push(message),
		pause: async (ms) => {
			state.pauses.push(ms);
		},
		prompt: async (question) => {
			state.prompts.push(question);
			return state.answers.shift() ?? '';
		},
		photonFetch: (async (url: string) => {
			state.photonCalls.push(url);
			return Response.json({
				features: [
					{
						geometry: { coordinates: [13.4, 52.5] },
						properties: { name: 'Berlin', country: 'Germany' }
					}
				]
			});
		}) as typeof fetch
	};
	return { fixture, state, sourceObjects, adapters, options };
}
