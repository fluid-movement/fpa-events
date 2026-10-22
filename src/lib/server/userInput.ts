import * as v from 'valibot';
import { APIError } from 'better-auth/api';

/**
 * A display name: a trimmed string of 1-100 characters with no control
 * characters (NUL, line breaks, tabs, escapes) and no line/paragraph
 * separators. Line breaks would inject lines into the calendar feed; NUL
 * makes Postgres reject the row.
 */
export const userNameSchema = v.pipe(
	v.string('Name must be text.'),
	v.trim(),
	v.minLength(1, 'Name is required.'),
	v.maxLength(100, 'Name is too long.'),
	v.regex(/^[^\p{Cc}\u2028\u2029]*$/u, 'Name contains invalid characters.')
);

/** The name, normalised; throws a 400 `APIError` when it is not acceptable. */
export function parseUserName(name: unknown): string {
	const result = v.safeParse(userNameSchema, name);
	if (!result.success) throw new APIError('BAD_REQUEST', { message: result.issues[0].message });
	return result.output;
}

/**
 * Better Auth `databaseHooks.user.create.before` / `update.before`. These run
 * for every write to the user table, including the library's own
 * `/api/auth/update-user` and `/sign-up/email`, whose bodies are barely typed
 * (`name` and `image` arrive as any value). The app has no avatar feature, so
 * `image` is always dropped rather than stored and later rendered as `<img src>`.
 */
export function guardUserWrite<T extends Record<string, unknown>>(
	data: T,
	{ requireName }: { requireName: boolean }
): { data: T } {
	const guarded: Record<string, unknown> = { ...data };
	if (requireName || 'name' in guarded) guarded.name = parseUserName(guarded.name);
	if ('image' in guarded) guarded.image = null;
	return { data: guarded as T };
}
