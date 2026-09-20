/**
 * A stand-in for a remote form's `fields` object, for unit tests that render a
 * component needing one without going through a real `form()`.
 *
 * SvelteKit 3 encodes the form id and a type prefix into each field's `name`
 * (`picture/17zti6o`, `n:width/…`), which would make every `input[name="…"]`
 * selector in a test depend on a generated id. This stub emits the plain name
 * instead: the component's own behaviour is what these tests are about, not
 * SvelteKit's wire format.
 *
 * It does model the part of Kit's behaviour components actually depend on:
 * the field — not the caller — owns its value, and the seed passed to
 * `as(type, seed)` applies only while the field is clean. Real typing gets
 * there through a form-level `input` listener this stub has no way to install,
 * so a test simulates it the same way Kit's listener does, by calling `set()`.
 */
export function stubFormFields<T>(): T {
	const values = new Map<string, unknown>();
	const dirtied = new Set<string>();

	const field = (name: string) => ({
		as: (type: string, seed?: unknown) => ({
			name,
			type,
			// Mirrors `read()` in Kit's `runtime/form-utils.js`: the field's own
			// state wins, and a dirty field suppresses the seed entirely.
			value: values.get(name) ?? (dirtied.has(name) ? '' : (seed ?? ''))
		}),
		value: () => values.get(name),
		set: (value: unknown) => {
			values.set(name, value);
			dirtied.add(name);
			return value;
		},
		dirty: () => dirtied.has(name),
		touched: () => dirtied.has(name),
		issues: () => undefined,
		allIssues: () => undefined
	});

	return new Proxy({} as Record<string, unknown>, {
		get: (_target, key: string) => field(key)
	}) as T;
}
