// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../verify-preparation.mjs', import.meta.url));
const fixtures: string[] = [];
const manifest = {
	name: 'migration-fixture',
	version: '1.0.0',
	dependencies: { pg: '^8.13.1' },
	devDependencies: { tsx: '^4.19.2' }
};

afterEach(() => {
	for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function prepare(pkg: unknown, lock: unknown, env: Record<string, string> = {}) {
	const dir = mkdtempSync(path.join(tmpdir(), 'migration-preparation-test-'));
	fixtures.push(dir);
	writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
	if (lock !== undefined) writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify(lock));
	return spawnSync(process.execPath, [script], {
		cwd: dir,
		// An explicit allowlist: never pass the test runner's environment/credentials.
		env,
		encoding: 'utf8'
	});
}

describe('migration dependency preparation boundary', () => {
	it('accepts a matching locked manifest without credentials', () => {
		const result = prepare(manifest, { packages: { '': manifest } });
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('Credential-free manifest/lock preflight passed');
	});

	it.each([
		'DATABASE_URL',
		'LEGACY_DATABASE_URL',
		'TARGET_DATABASE_URL',
		'LEGACY_R2_SECRET_ACCESS_KEY',
		'TARGET_R2_SECRET_ACCESS_KEY',
		'R2_SECRET_ACCESS_KEY'
	])('rejects a credential-bearing preparation environment (%s)', (key) => {
		const result = prepare(manifest, { packages: { '': manifest } }, { [key]: 'harmless-canary' });
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Preparation must have no migration credentials');
		expect(result.stdout).not.toContain('preflight passed');
	});

	it.each([
		{ ...manifest, dependencies: { pg: '^9.0.0' } },
		{ ...manifest, dependencies: {} },
		{ ...manifest, devDependencies: { tsx: '^5.0.0' } },
		{ ...manifest, optionalDependencies: { example: '1.0.0' } }
	])('fails closed on changed, removed or added dependency declarations (%j)', (changed) => {
		const result = prepare(changed, { packages: { '': manifest } });
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('Manifest/lock mismatch');
		expect(result.stdout).not.toContain('preflight passed');
	});

	it('rejects an absent lockfile', () => {
		const result = prepare(manifest, undefined);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('package-lock.json');
	});
});
