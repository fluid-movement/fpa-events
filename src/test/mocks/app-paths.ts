// Stands in for `$app/paths` under Vitest (aliased in vite.config.ts).
//
// SvelteKit 3 removed `base`, `assets` and `resolveRoute`; what remains is
// `resolve`, `asset` and `match`.
//
// `resolve` substitutes params into the route id the same way the real one
// does, so `resolve('/events/[id]', { id: 'e1' })` yields `/events/e1`.
export const resolve = (route: string, params?: Record<string, string>) =>
	params
		? route.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (match, name: string) => params[name] ?? match)
		: route;

export const asset = (file: string) => file;
