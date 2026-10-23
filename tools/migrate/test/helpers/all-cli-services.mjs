// Preload for the REAL src/migrate-all.ts executable: mock service boundaries
// only. No replacement entry point, orchestration, verification, catch or exit.
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import * as aws from '@aws-sdk/client-s3';
import { offline } from './offline.ts';

const config = JSON.parse(readFileSync(0, 'utf8'));
const f = offline();
f.fixture.rows.events[0].picture = 'pictures/legacy.png';
f.sourceObjects['pictures/legacy.png'] = { contentType: 'image/png', body: [4, 5, 6] };
if (config.fixture) Object.assign(f.fixture, config.fixture);
Object.assign(f.state, config.state);
if (config.sourceObjects) {
	for (const key of Object.keys(f.sourceObjects)) delete f.sourceObjects[key];
	Object.assign(f.sourceObjects, config.sourceObjects);
}
f.state.lifecycle = [];
Object.defineProperty(process.stdin, 'isTTY', {
	value: config.stdinTTY ?? true,
	configurable: true
});
Object.defineProperty(process.stdout, 'isTTY', {
	value: config.stdoutTTY ?? true,
	configurable: true
});
globalThis.fetch = f.adapters.photonFetch;

class Pool {
	constructor({ connectionString }) {
		const side = connectionString === process.env.LEGACY_DATABASE_URL ? 'legacy' : 'target';
		return {
			...f.adapters[side],
			end: async () => f.state.lifecycle.push(`${side}.end`)
		};
	}
}
class S3Client {
	constructor({ endpoint }) {
		const side = endpoint.includes('legacy-account') ? 'legacy' : 'target';
		return {
			...f.adapters[`${side}R2`],
			destroy: () => f.state.lifecycle.push(`${side}R2.destroy`)
		};
	}
}
globalThis.migrationCliServices = {
	Pool,
	S3Client,
	aws,
	loadLocationMap: f.adapters.loadMap,
	saveLocationMap: f.adapters.saveMap,
	createInterface: () => ({
		question: f.adapters.prompt,
		close: () => f.state.lifecycle.push('terminal.close')
	})
};

const root = new URL('../../src/', import.meta.url).href;
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (context.parentURL?.startsWith(root)) {
			const replacements = {
				pg: 'pg',
				'dotenv/config': 'dotenv',
				'@aws-sdk/client-s3': 's3',
				'node:readline/promises': 'readline',
				'./locations': 'locations'
			};
			if (Object.hasOwn(replacements, specifier)) {
				return { url: `migration-cli-services:${replacements[specifier]}`, shortCircuit: true };
			}
		}
		return nextResolve(specifier, context);
	},
	load(url, context, nextLoad) {
		const replacements = {
			'migration-cli-services:pg': 'export default { Pool: globalThis.migrationCliServices.Pool };',
			'migration-cli-services:dotenv': 'export {};',
			'migration-cli-services:s3': `
				export const S3Client = globalThis.migrationCliServices.S3Client;
				export const { HeadObjectCommand, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = globalThis.migrationCliServices.aws;
			`,
			'migration-cli-services:readline':
				'export const { createInterface } = globalThis.migrationCliServices;',
			'migration-cli-services:locations':
				'export const { loadLocationMap, saveLocationMap } = globalThis.migrationCliServices;'
		};
		if (Object.hasOwn(replacements, url))
			return { format: 'module', source: replacements[url], shortCircuit: true };
		return nextLoad(url, context);
	}
});

process.on('exit', () =>
	process.stdout.write(`\nMIGRATION_ALL_STATE=${JSON.stringify(f.state)}\n`)
);
