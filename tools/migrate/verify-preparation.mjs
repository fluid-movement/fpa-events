// Run before npm ci. Never load dotenv here: preparation must be secret-free.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

assert(
	!Object.keys(process.env).some((key) => /^(DATABASE_URL$|R2_|TARGET_|LEGACY_)/.test(key)),
	'Preparation must have no migration credentials'
);
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
// npm ci validates the resolved tree too. Check the declared ranges first so
// even removed dependencies or changed ranges fail before registry resolution.
for (const field of [
	'name',
	'version',
	'dependencies',
	'devDependencies',
	'optionalDependencies'
]) {
	assert.deepEqual(
		manifest[field],
		lock.packages?.['']?.[field],
		`Manifest/lock mismatch: ${field}`
	);
}
console.log('Credential-free manifest/lock preflight passed');
