import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Every remote function is a public HTTP endpoint the moment it is exported, so
 * the guard has to be the first thing its handler does. This reads each
 * `*.remote.ts` source, requires every export to be registered below with the
 * guard it must call, and requires that call to come before any database access.
 *
 * Adding a remote function without listing it here fails the test on purpose:
 * choosing 'public' is a decision someone has to make in the diff.
 */
// Read from disk: importing a remote module (even `?raw`) trips Kit's remote plugin.
const root = join(import.meta.dirname, '../../..');
const sources: Record<string, string> = Object.fromEntries(
	(readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' }) as string[])
		.filter((file) => file.endsWith('.remote.ts'))
		.map((file) => [
			'/' +
				relative(root, join(root, 'src', file))
					.split('\\')
					.join('/'),
			readFileSync(join(root, 'src', file), 'utf8')
		])
);

type Guard = 'manager' | 'owner' | 'signedIn' | 'dev' | 'public';

const GUARD_CALL: Record<Exclude<Guard, 'public'>, string> = {
	manager: 'requireEventManager(',
	owner: 'requireEventOwner(',
	signedIn: 'requireSignedInRequest(',
	dev: 'import.meta.env.DEV'
};

const REGISTRY: Record<string, Guard> = {
	// events/[id]/admin
	'/src/routes/events/[id]/admin/delete-event.remote.ts#deleteEvent': 'owner',
	'/src/routes/events/[id]/admin/event-details.remote.ts#getEvent': 'manager',
	'/src/routes/events/[id]/admin/event-details.remote.ts#updateEvent': 'manager',
	'/src/routes/events/[id]/admin/invites/magic-links.remote.ts#generateLink': 'manager',
	'/src/routes/events/[id]/admin/invites/magic-links.remote.ts#regenerateLink': 'manager',
	'/src/routes/events/[id]/admin/schedule/locations.remote.ts#listEventLocations': 'manager',
	'/src/routes/events/[id]/admin/schedule/locations.remote.ts#createEventLocation': 'manager',
	'/src/routes/events/[id]/admin/schedule/locations.remote.ts#deleteEventLocation': 'manager',
	'/src/routes/events/[id]/admin/schedule/schedule.remote.ts#addSchedule': 'manager',
	'/src/routes/events/[id]/admin/schedule/schedule.remote.ts#updateSchedule': 'manager',
	'/src/routes/events/[id]/admin/schedule/schedule.remote.ts#deleteSchedule': 'manager',
	// signed-in users acting on their own rows
	'/src/routes/events/[id]/data.remote.ts#toggleRsvp': 'signedIn',
	'/src/routes/events/create/data.remote.ts#createEvent': 'signedIn',
	'/src/routes/invite/[token]/data.remote.ts#acceptInvite': 'signedIn',
	'/src/routes/settings/privacy/data.remote.ts#getPrivacySettings': 'signedIn',
	'/src/routes/settings/privacy/data.remote.ts#setShowAttendance': 'signedIn',
	'/src/routes/settings/profile/data.remote.ts#updateProfile': 'signedIn',
	'/src/routes/settings/account/data.remote.ts#deleteAccount': 'signedIn',
	'/src/lib/api/calendar.remote.ts#regenerateToken': 'signedIn',
	// dev tooling, compiled to a 404 in production builds
	'/src/routes/dev/emails/data.remote.ts#sendTestEmailForm': 'dev',
	// public read-only data (data-exposure audit owns these)
	'/src/lib/api/results.remote.ts#getResultEvents': 'public',
	'/src/lib/api/results.remote.ts#getEventResults': 'public',
	'/src/lib/api/rankings.remote.ts#getSeries': 'public',
	'/src/lib/api/rankings.remote.ts#getRankings': 'public',
	'/src/lib/api/rankings.remote.ts#getRatings': 'public',
	'/src/lib/api/rankings.remote.ts#getScoringResults': 'public',
	'/src/lib/api/players.remote.ts#getPlayerProfile': 'public'
};

/** Each exported remote function with the source text of its declaration. */
function exportsOf(path: string, source: string) {
	const starts = [...source.matchAll(/^export (?!type |interface )(.*)$/gm)];
	return starts.map((m, i) => {
		const name = m[1].match(/^const (\w+) = (?:form|query|command)\(/)?.[1];
		const end = starts[i + 1]?.index ?? source.length;
		return { key: `${path}#${name ?? m[1]}`, name, body: source.slice(m.index, end) };
	});
}

const found = Object.entries(sources).flatMap(([path, source]) => exportsOf(path, source));

describe('remote function guards', () => {
	it('finds the remote files', () => {
		expect(Object.keys(sources).length).toBeGreaterThan(5);
	});

	it('lists every exported remote function, and nothing stale', () => {
		expect(found.filter((f) => !f.name).map((f) => f.key)).toEqual([]);
		expect(found.map((f) => f.key).sort()).toEqual(Object.keys(REGISTRY).sort());
	});

	it.each(found.filter((f) => REGISTRY[f.key] && REGISTRY[f.key] !== 'public'))(
		'$key calls its guard before touching the database',
		({ key, body }) => {
			const guard = REGISTRY[key] as Exclude<Guard, 'public'>;
			const at = body.indexOf(GUARD_CALL[guard]);
			expect(at, `${key} must call ${GUARD_CALL[guard]}`).toBeGreaterThan(-1);
			// A guard after the first query or write is not a guard.
			const firstDb = body.search(/\bdb\b|\bsql\b/);
			if (firstDb !== -1) expect(at).toBeLessThan(firstDb);
		}
	);
});
