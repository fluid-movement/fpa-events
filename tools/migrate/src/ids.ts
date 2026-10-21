// Validate the original ASCII characters, without Unicode case folding.
const ULID_PATTERN = /^[0-7][0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz]{25}$/;

/** Validate both primary IDs and references without changing their original case. */
export function assertLegacyIds<T>(table: string, rows: T[], fields: (keyof T & string)[]): void {
	const invalid: string[] = [];
	for (const [index, row] of rows.entries()) {
		for (const field of fields) {
			const id = row[field];
			// The first character must fit 128 bits; a separate length check also
			// rejects trailing line breaks (which JS's $ anchor can otherwise admit).
			if (typeof id !== 'string' || id.length !== 26 || !ULID_PATTERN.test(id)) {
				invalid.push(`${table}[${index}].${field}=${JSON.stringify(id)}`);
			}
		}
	}
	if (invalid.length > 0) {
		throw new Error(`Invalid legacy ULID(s); import aborted: ${invalid.join('; ')}`);
	}
}
