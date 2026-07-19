import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword as verifyScryptPassword } from 'better-auth/crypto';

// Accounts migrated from the legacy Laravel app carry bcrypt hashes ($2y$…);
// accounts created here use Better Auth's default scrypt format.
const BCRYPT_PREFIX = /^\$2[aby]\$/;

export { hashPassword };

export async function verifyPassword({
	hash,
	password
}: {
	hash: string;
	password: string;
}): Promise<boolean> {
	if (BCRYPT_PREFIX.test(hash)) {
		// PHP emits the $2y$ variant, which is identical to $2b$.
		return bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2b$'));
	}
	return verifyScryptPassword({ hash, password });
}
