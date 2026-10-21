// @vitest-environment node
// Node, as on the server: Kit decodes base64 with Buffer there, not atob.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'node:util';
import type { ErrorEvent } from '@sentry/core';
import { exceptionFromError } from '@sentry/core';
import type { RequestEvent } from '@sveltejs/kit';
import { isHttpError } from '@sveltejs/kit';
import { DrizzleQueryError } from 'drizzle-orm';
import postgres from 'postgres';

const mocks = vi.hoisted(() => ({
	session: vi.fn(),
	capture: vi.fn(),
	scope: { setTag: vi.fn(), setTransactionName: vi.fn(), setUser: vi.fn() },
	options: {} as { beforeSend?: (event: ErrorEvent) => ErrorEvent }
}));
vi.mock('#lib/server/auth', () => ({ auth: { api: { getSession: mocks.session } } }));
vi.mock('#lib/server/db', () => ({ db: {} }));
vi.mock('$app/env', () => ({ building: false }));
vi.mock('better-auth/svelte-kit', () => ({ svelteKitHandler: vi.fn() }));
vi.mock('@sentry/sveltekit', () => ({
	init: (options: typeof mocks.options) => {
		mocks.options = options;
	},
	withScope: (fn: (scope: typeof mocks.scope) => void) => fn(mocks.scope),
	captureException: mocks.capture
}));
import { handle, handleError } from './hooks.server';
import { parseRemoteArg, stringifyRemoteArg } from './test/kit-wire';

function event(
	url = 'https://example.org/_app/remote/hash/getEvent',
	routeId: string | null = null,
	params: Record<string, string> = {}
) {
	return {
		request: new Request(url),
		url: new URL(url),
		params,
		locals: {},
		route: { id: routeId }
	} as unknown as RequestEvent;
}

/** What the console would actually print, error objects included. */
const printed = (spy: { mock: { calls: unknown[][] } }) =>
	spy.mock.calls.map((call) => format(...call)).join('\n');

beforeEach(() => {
	vi.clearAllMocks();
});

describe('server error hook', () => {
	it.each(['app', 'framework', 'validation'] as const)(
		'does not log or capture expected %s errors',
		async (kind) => {
			const log = vi.spyOn(console, 'error').mockImplementation(() => {});
			const error = { status: 400, message: 'Bad Request' };
			if (kind === 'validation') {
				await handleError({ kind, error, issues: [], event: event() });
			} else {
				await handleError({ kind, error, event: event() });
			}
			expect(log).not.toHaveBeenCalled();
			expect(mocks.capture).not.toHaveBeenCalled();
			log.mockRestore();
		}
	);
	it('answers an argument Kit cannot decode as 400 with no report or log', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		let error: unknown;
		try {
			parseRemoteArg('AAAA');
		} catch (caught) {
			error = caught;
		}
		const response = await handleError({
			kind: 'unknown',
			error,
			event: event('https://example.org/_app/remote/hash/getEvent?payload=AAAA')
		});
		expect(response).toEqual({ status: 400, message: 'Bad Request' });
		expect(log).not.toHaveBeenCalled();
		expect(mocks.capture).not.toHaveBeenCalled();
		log.mockRestore();
	});
	it('reports a genuine callback fault, including SyntaxError', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new SyntaxError('broken server JSON');
		const url = `https://example.org/_app/remote/hash/getEvent?payload=${stringifyRemoteArg('x')}`;
		const response = await handleError({ kind: 'unknown', error, event: event(url) });
		expect(response).toMatchObject({ message: 'Internal Error', errorId: expect.any(String) });
		expect(mocks.capture).toHaveBeenCalledWith(error);
		expect(log).toHaveBeenCalled();
		log.mockRestore();
	});
	it('keeps database faults reportable without tokens in actual console output or scrubbed reports', async () => {
		const token = 'CANARY_live_invite_token';
		const cause = new (postgres.PostgresError as unknown as new (data: object) => Error)({
			message: `invalid token "${token}"`,
			detail: token,
			code: '22P02'
		});
		const error = new DrizzleQueryError('select id from invites where token = $1', [token], cause);
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const delivered: ErrorEvent[] = [];
		// Exercise the hook's configured beforeSend with SDK-built exceptions,
		// including the cause chain; no DSN or network is used in a unit test.
		mocks.capture.mockImplementationOnce((error: Error) => {
			const values = [];
			for (
				let current: Error | undefined = error;
				current;
				current = current.cause as Error | undefined
			) {
				values.push(exceptionFromError(() => [], current));
			}
			delivered.push(mocks.options.beforeSend!({ type: undefined, exception: { values } }));
		});
		const response = await handleError({
			kind: 'unknown',
			error,
			event: event('https://example.org/invite/' + token, '/invite/[token]', { token })
		});
		expect(response).toHaveProperty('errorId');
		expect(mocks.capture).toHaveBeenCalledOnce();
		expect(printed(log)).toContain('Failed query: select id from invites');
		expect(printed(log)).not.toContain(token);
		expect(printed(log)).not.toContain('params:');
		expect(delivered).toHaveLength(1);
		expect(JSON.stringify(delivered)).not.toContain(token);
		expect(JSON.stringify(delivered)).not.toContain('params:');
		log.mockRestore();
	});
	it('rejects NUL paths before even looking up a session', async () => {
		await expect(
			handle({
				event: event('https://example.org/events/%00', '/events/[id]', { id: '\0' }),
				resolve: vi.fn()
			})
		).rejects.toSatisfy((error: unknown) => isHttpError(error, 400));
		expect(mocks.session).not.toHaveBeenCalled();
	});
});
