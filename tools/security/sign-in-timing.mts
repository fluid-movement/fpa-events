// Isolated experiment: synthetic accounts, in-memory adapter, no sockets or DB.
// Run from the repo root: node tools/security/sign-in-timing.mts
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { hashPassword, verifyPassword } from '../../src/lib/server/password.ts';
import { withFailedSignInTiming } from '../../src/lib/server/sign-in-timing.ts';

const samples = 5;
const password = 'synthetic-correct-password';
const cases = [
	{ name: 'unknown', kind: 'unknown' },
	{ name: 'no-account', kind: 'no-account' },
	{ name: 'missing-password', hash: null },
	{ name: 'scrypt', hash: await hashPassword(password) },
	...(await Promise.all(
		[
			{ variant: '2a', cost: 10 },
			{ variant: '2b', cost: 12 },
			{ variant: '2y', cost: 13 },
			{ variant: '2y', cost: 14 }
		].map(async ({ variant, cost }) => ({
			name: `${variant}-${cost}`,
			hash: (await bcrypt.hash(password, cost)).replace(/^\$2b\$/, `$${variant}$`)
		}))
	))
];
const fixtures = cases.map((entry, index) => {
	const id = `synthetic-${index}`;
	const email = `${id}@example.invalid`;
	const auth = betterAuth({
		baseURL: 'http://localhost:5173',
		secret: 'synthetic-experiment-secret-not-used-anywhere-else',
		database: memoryAdapter({
			user:
				'kind' in entry && entry.kind === 'unknown'
					? []
					: [
							{
								id,
								email,
								name: id,
								emailVerified: true,
								createdAt: new Date(),
								updatedAt: new Date()
							}
						],
			account:
				'kind' in entry
					? []
					: [{ id, userId: id, accountId: id, providerId: 'credential', password: entry.hash }],
			session: [],
			verification: []
		}),
		emailAndPassword: { enabled: true, password: { hash: hashPassword, verify: verifyPassword } },
		logger: { disabled: true }
	});
	return { name: entry.name, email, auth, baseline: [] as number[], padded: [] as number[] };
});

console.log(
	`${process.version}; ${cpus()[0]?.model}; ${samples} sequential samples per case/mode after warmup`
);
// Rotate case order each round to reduce order bias. Real hashes and the real
// handler run in both modes; the only difference is the response timing wrapper.
for (let round = -1; round < samples; round++) {
	for (let index = 0; index < fixtures.length; index++) {
		const fixture = fixtures[(index + round + fixtures.length) % fixtures.length];
		for (const mode of ['baseline', 'padded'] as const) {
			const request = new Request('http://localhost:5173/api/auth/sign-in/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: fixture.email, password: 'synthetic-wrong-password' })
			});
			const start = performance.now();
			const response =
				mode === 'padded'
					? await withFailedSignInTiming(request, () => fixture.auth.handler(request))
					: await fixture.auth.handler(request);
			const elapsed = performance.now() - start;
			const body = await response.json();
			if (response.status !== 401 || body.code !== 'INVALID_EMAIL_OR_PASSWORD') {
				throw new Error(`Unexpected response for ${fixture.name}: ${response.status}`);
			}
			if (round >= 0) fixture[mode].push(elapsed);
		}
	}
}
function summary(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b);
	return `${sorted[Math.floor(sorted.length / 2)].toFixed(1)} (${sorted[0].toFixed(1)}–${sorted.at(-1)!.toFixed(1)})`;
}
console.table(
	fixtures.map(({ name, baseline, padded }) => ({
		case: name,
		'baseline median (range) ms': summary(baseline),
		'padded median (range) ms': summary(padded)
	}))
);
