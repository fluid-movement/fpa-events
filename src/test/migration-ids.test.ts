import { describe, expect, it } from 'vitest';
import { assertLegacyIds } from '../../tools/migrate/src/ids';
import { migrationFixture, runMigrationCli, type LegacyTable } from './helpers/migration-cli';

const validId = '01M5A4X9AP5EG81X6ZCN9Q4JPJ';
const invalidIds = [
	`${validId.slice(0, -1)}ſ`,
	`${validId.slice(0, -1)}ß`,
	'x"><img src=x onerror=alert(1)>'
];
const importedFields: [LegacyTable, string[]][] = [
	['users', ['id']],
	['events', ['id', 'user_id']],
	['event_user', ['event_id', 'user_id']],
	['event_magic_links', ['id', 'event_id']],
	['schedules', ['id', 'event_id']]
];

describe('actual importer ID enforcement', () => {
	it.each(
		importedFields.flatMap(([table, fields]) =>
			fields.flatMap((field) => invalidIds.map((id) => ({ table, field, id })))
		)
	)(
		'rejects $table.$field = $id before inserting that batch and rolls back earlier work',
		({ table, field, id }) => {
			const fixture = migrationFixture();
			fixture.rows[table].push({ ...fixture.rows[table][0], [field]: id });
			const result = runMigrationCli('migrate', fixture);
			expect(result.status, result.stderr).toBe(1);
			expect(result.stderr).toContain(
				`Invalid legacy ULID(s); import aborted: ${table}[1].${field}=`
			);
			expect(result.state.tables).toEqual(fixture.initialTables);
			expect(result.state.queries.at(-1)?.sql).toBe('ROLLBACK');
			const targetTable = table === 'users' ? 'user' : table;
			expect(
				result.state.queries.some(({ sql }) =>
					new RegExp(`INSERT INTO "?${targetTable}"?\\s`).test(sql)
				)
			).toBe(false);
		}
	);
});

describe('legacy import ULID validation', () => {
	it('accepts valid ULIDs of either case without rewriting their identity', () => {
		const rows = [{ id: validId, event_id: validId.toLowerCase() }];
		const original = structuredClone(rows);
		expect(() => assertLegacyIds('schedules', rows, ['id', 'event_id'])).not.toThrow();
		expect(rows).toEqual(original);
	});

	it.each([
		'',
		null,
		undefined,
		123,
		validId.slice(1),
		`${validId}0`,
		`${validId}\n`,
		` ${validId}`,
		`${validId.slice(0, -1)}I`,
		`${validId.slice(0, -1)}L`,
		`${validId.slice(0, -1)}O`,
		`${validId.slice(0, -1)}U`,
		...invalidIds,
		`8${validId.slice(1)}`,
		`x" onmouseover="alert(1)`,
		`x"><img src=x onerror=alert(1)>`
	])('rejects malformed primary id %j', (id) => {
		expect(() => assertLegacyIds('users', [{ id }], ['id'])).toThrow(
			/Invalid legacy ULID.*users\[0\].id=/
		);
	});

	it.each([
		['events', ['id', 'user_id']],
		['event_user', ['event_id', 'user_id']],
		['event_magic_links', ['id', 'event_id']],
		['schedules', ['id', 'event_id']]
	] as const)(
		'rejects malformed references in %s even when primary IDs are valid',
		(table, fields) => {
			const rows = [{ id: validId, event_id: validId, user_id: validId }];
			for (const field of fields) {
				const invalid = [{ ...rows[0], [field]: '<bad-id>' }];
				expect(() => assertLegacyIds(table, invalid, [...fields])).toThrow(`${field}="<bad-id>"`);
			}
		}
	);

	it('reports all invalid fields in the batch before returning', () => {
		expect(() =>
			assertLegacyIds('events', [{ id: 'bad', user_id: 'also bad' }], ['id', 'user_id'])
		).toThrow(/events\[0\].id="bad".*events\[0\].user_id="also bad"/);
	});
});
