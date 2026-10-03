/**
 * A stand-in for a remote form's `fields` object, for unit tests that render a
 * component needing one without going through a real `form()`.
 *
 * SvelteKit 3 encodes the form id and a type prefix into each field's `name`
 * (`picture/17zti6o`, `n:width/…`), which would make every `input[name="…"]`
 * selector in a test depend on a generated id. This stub emits the plain name
 * instead: the component's own behaviour is what these tests are about, not
 * SvelteKit's wire format.
 */
export function stubFormFields<T>(): T {
	const field = (name: string) => ({
		as: (type: string, value?: unknown) => ({ name, type, value: value ?? '' }),
		value: () => undefined,
		issues: () => undefined,
		allIssues: () => undefined
	});

	return new Proxy({} as Record<string, unknown>, {
		get: (_target, key: string) => field(key)
	}) as T;
}
