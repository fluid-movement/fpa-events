import { resolve } from '$app/paths';

// `base` was removed from `$app/paths` in SvelteKit 3; `resolve` already
// accounts for it.
export const eventPath = (id: string) => resolve('/events/[id]', { id });
