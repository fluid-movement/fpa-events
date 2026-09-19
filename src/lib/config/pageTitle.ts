/**
 * The label shown in the mobile top bar.
 *
 * Routes with a dynamic name (an event, a year) return `title` from their load
 * function; everything else is matched here, so pages with no load function —
 * the legal pages, for instance — still get a title. Deliberately derived from
 * `page` rather than a store: a module-level store would leak between requests
 * during SSR, and the top bar renders before the page content sets it.
 */
const STATIC_TITLES: Record<string, string> = {
	'/': 'Home',
	'/events': 'Events',
	'/events/create': 'Create event',
	'/rankings': 'Rankings',
	'/results': 'Results',
	'/players': 'Player',
	'/dashboard': 'Dashboard',
	'/attending': 'Attending',
	'/organizing': 'Organizing',
	'/settings': 'Settings',
	'/privacy-policy': 'Privacy policy',
	'/legal-notice': 'Legal notice',
	'/sign-in': 'Sign in',
	'/sign-up': 'Create account',
	'/forget-password': 'Reset password',
	'/reset-password': 'Reset password'
};

export function pageTitle(pathname: string, data?: { title?: unknown }): string {
	if (typeof data?.title === 'string' && data.title) return data.title;

	const exact = STATIC_TITLES[pathname];
	if (exact) return exact;

	// Longest prefix wins, so /settings/password falls back to "Settings" rather
	// than to the root "Home".
	const prefix = Object.keys(STATIC_TITLES)
		.filter((route) => route !== '/' && pathname.startsWith(route))
		.sort((a, b) => b.length - a.length)[0];

	return prefix ? STATIC_TITLES[prefix] : 'FPA Events';
}
