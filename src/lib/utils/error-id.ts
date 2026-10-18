/** 8 hex characters: short enough to read out, plenty for this traffic. */
export function newErrorId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}
