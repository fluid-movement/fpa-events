import { describe, expect, it } from 'vitest';
import { normalizeLegacyEmails } from '../../tools/migrate/src/emails';
import { migrationFixture, runMigrationCli, userId } from './helpers/migration-cli';

describe('actual legacy user importer', () => {
	it('inserts canonical emails with original IDs and credentials and prints normalization counts', () => {
		const fixture = migrationFixture();
		fixture.rows.users[0].email = ' \tSomeone@Example.org\n';
		const result = runMigrationCli('migrate', fixture);
		expect(result.status, result.stderr).toBe(0);
		expect(result.state.tables.user[0]).toEqual([
			userId,
			'Legacy user',
			'someone@example.org',
			'user',
			'2026-10-21 12:00:00',
			'2026-10-21 12:00:00'
		]);
		const account = result.state.tables.account[0];
		expect(account.slice(1)).toEqual([
			userId,
			'$2y$legacy-hash',
			'2026-10-21 12:00:00',
			'2026-10-21 12:00:00'
		]);
		expect(result.stdout).toContain('users: 1 email(s) normalized (trimmed and lowercased).');
		expect(result.stdout).toMatch(/users → user\s+1\s+1/);
	});

	it('reports zero normalizations on a dry run and rolls back its INSERTs', () => {
		const fixture = migrationFixture();
		fixture.rows.users[0].email = 'someone@example.org';
		const result = runMigrationCli('migrate', fixture, ['--dry-run']);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toContain('users: 0 email(s) normalized');
		expect(result.stdout).toContain('Dry run complete — all changes rolled back.');
		expect(result.state.tables).toEqual(fixture.initialTables);
		expect(
			result.state.queries.find(({ sql }) => sql.startsWith('INSERT INTO "user"'))?.params[2]
		).toBe('someone@example.org');
	});

	it('aborts colliding mailboxes before inserting users and restores the pre-wipe target', () => {
		const fixture = migrationFixture();
		const secondId = '01M5A4X8ZCM3JDSD66MKD07F34';
		fixture.rows.users.push({
			...fixture.rows.users[0],
			id: secondId,
			email: ' someone@example.org '
		});
		const result = runMigrationCli('migrate', fixture);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Legacy email collisions after normalization');
		expect(result.stderr).toContain(userId);
		expect(result.stderr).toContain(secondId);
		expect(result.state.tables).toEqual(fixture.initialTables);
		expect(result.state.queries.at(-1)?.sql).toBe('ROLLBACK');
		expect(result.state.queries.some(({ sql }) => sql.startsWith('INSERT'))).toBe(false);
	});
});

describe('legacy email import preflight', () => {
	it('produces canonical user rows without changing identity or credentials', () => {
		const original = { id: 'legacy-user', email: ' \tSomeone@Example.org\n', password: '$2y$hash' };
		const result = normalizeLegacyEmails([original]);
		expect(result).toEqual({
			users: [{ id: 'legacy-user', email: 'someone@example.org', password: '$2y$hash' }],
			normalized: 1
		});
		expect(original.email).toBe(' \tSomeone@Example.org\n');
	});

	it('counts changed addresses, including whitespace-only normalization', () => {
		expect(
			normalizeLegacyEmails([
				{ id: '1', email: 'one@example.org' },
				{ id: '2', email: ' two@example.org ' },
				{ id: '3', email: 'THREE@example.org' }
			]).normalized
		).toBe(2);
		expect(normalizeLegacyEmails([{ id: '1', email: 'one@example.org' }]).normalized).toBe(0);
		expect(normalizeLegacyEmails([])).toEqual({ users: [], normalized: 0 });
	});

	it.each([
		['Someone@Example.org', 'someone@example.org'],
		['someone@example.org', ' someone@example.org\t'],
		['someone@example.org', 'someone@example.org']
	])('rejects colliding identities %j and %j before returning any importable rows', (a, b) => {
		expect(() =>
			normalizeLegacyEmails([
				{ id: 'first-user', email: a },
				{ id: 'second-user', email: b }
			])
		).toThrow(/"someone@example.org": user IDs "first-user", "second-user"/);
	});

	it('reports every collision group so the owner can resolve the full batch', () => {
		expect(() =>
			normalizeLegacyEmails([
				{ id: '1', email: 'ONE@example.org' },
				{ id: '2', email: 'one@example.org' },
				{ id: '3', email: 'TWO@example.org' },
				{ id: '4', email: 'two@example.org' }
			])
		).toThrow(/one@example.org.*"1", "2".*two@example.org.*"3", "4"/);
	});
});
