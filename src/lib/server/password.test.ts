import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from './password';

describe('verifyPassword', () => {
	it('verifies legacy Laravel bcrypt hashes ($2y$)', async () => {
		const legacyHash = bcrypt.hashSync('legacy-secret', 10).replace(/^\$2b\$/, '$2y$');
		await expect(verifyPassword({ hash: legacyHash, password: 'legacy-secret' })).resolves.toBe(
			true
		);
		await expect(verifyPassword({ hash: legacyHash, password: 'wrong' })).resolves.toBe(false);
	});

	it('verifies $2a$ and $2b$ bcrypt variants', async () => {
		const hash = bcrypt.hashSync('secret', 10);
		expect(hash).toMatch(/^\$2b\$/);
		await expect(verifyPassword({ hash, password: 'secret' })).resolves.toBe(true);
		const legacy2a = bcrypt.hashSync('secret', 10).replace(/^\$2b\$/, '$2a$');
		await expect(verifyPassword({ hash: legacy2a, password: 'secret' })).resolves.toBe(true);
	});

	it('verifies Better Auth scrypt hashes', async () => {
		const hash = await hashPassword('scrypt-secret');
		await expect(verifyPassword({ hash, password: 'scrypt-secret' })).resolves.toBe(true);
		await expect(verifyPassword({ hash, password: 'wrong' })).resolves.toBe(false);
	});
});
