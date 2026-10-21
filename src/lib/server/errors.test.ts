// @vitest-environment node
// Node, as on the server: Kit decodes base64 with Buffer there, not atob.
import { describe, expect, it } from 'vitest';
import { describeServerError, newErrorId, type ServerErrorInput } from './errors';

const input = (overrides: Partial<ServerErrorInput> = {}): ServerErrorInput => ({
	kind: 'unknown',
	error: new Error('connection refused'),
	method: 'GET',
	routeId: '/events/[id]',
	userId: 'u1',
	...overrides
});

describe('describeServerError', () => {
	it('reports an unexpected error with reference, route, user and message', () => {
		const report = describeServerError(input(), 'abc12345');

		expect(report?.errorId).toBe('abc12345');
		expect(report?.logLine).toBe(
			'[server error] ref=abc12345 | GET /events/[id] | user=u1 | Error: connection refused'
		);
		expect(report?.stack).toContain('connection refused');
	});

	it.each(['app', 'framework', 'validation'] as const)('leaves %s errors alone', (kind) => {
		expect(describeServerError(input({ kind }))).toBeNull();
	});

	// The calendar feed and invite links carry their credential in the path.
	it('names the route id, so a token in the URL never reaches the log', () => {
		const report = describeServerError(input({ routeId: '/api/calendar/[token]/feed.ics' }));

		expect(report?.logLine).toContain('/api/calendar/[token]/feed.ics');
	});

	it('copes with a thrown non-Error and a signed-out visitor', () => {
		const report = describeServerError(input({ error: 'boom', userId: null, routeId: null }));

		expect(report?.logLine).toContain('user=anonymous');
		expect(report?.logLine).toContain('(no route)');
		expect(report?.logLine).toContain('Error: boom');
	});
});

describe('newErrorId', () => {
	it('is 8 hex characters', () => {
		expect(newErrorId()).toMatch(/^[0-9a-f]{8}$/);
	});
});

import { DrizzleQueryError } from 'drizzle-orm';
import postgres from 'postgres';

describe('server log database allowlist', () => {
	const token = 'LIVE_CALENDAR_TOKEN_secret';
	it('removes Drizzle parameters from both the line and the printed stack', () => {
		const error = new DrizzleQueryError(
			'select id from user where calendar_token = $1',
			[token],
			new Error('connection reset')
		);
		const report = describeServerError(input({ error }), 'dbref123');
		const output = JSON.stringify(report);
		expect(output).not.toContain(token);
		expect(output).not.toContain('params:');
		expect(report?.logLine).toContain('calendar_token = $1');
		expect(report?.stack).toContain('at ');
		expect(report?.errorId).toBe('dbref123');
	});
	it('drops an entire Postgres message, including fake stack frames supplied as data', () => {
		const error = new (postgres.PostgresError as unknown as new (data: object) => Error)({
			message: `invalid value: "${token}"\n    at fake (${token}:1:1)`,
			detail: `Key (token)=(${token})`,
			code: '22P02'
		});
		const report = describeServerError(input({ error }));
		expect(JSON.stringify(report)).not.toContain(token);
		expect(report?.logLine).toContain('[database error: message dropped]');
		expect(report?.stack).toContain('at ');
	});
	it('fails closed for an unfamiliar stack format', () => {
		const error = new Error('Failed query: select $1\nparams: ' + token);
		error.stack = `unfamiliar header with ${token}`;
		const report = describeServerError(input({ error }));
		expect(report?.stack).toBeUndefined();
		expect(report?.logLine).not.toContain(token);
	});
});

// Kit's own client serialiser and server parser, not copies of them: if Kit
// changes its wire format these fail instead of production requests.
import { convertFormData, parseRemoteArg, stringifyRemoteArg } from '../../test/kit-wire';
import { isMalformedClientInput, remotePayloadIsJson } from './errors';

const QUERY = 'https://example.org/_app/remote/abc123/getPlayerProfile';
const FORM = 'https://example.org/_app/remote/abc123/updateEvent';

/** The error Kit's own server decoder throws for this payload. */
function kitDecodeError(payload: string): unknown {
	try {
		parseRemoteArg(payload);
	} catch (error) {
		return error;
	}
	throw new Error(`Kit decoded ${payload}`);
}

describe('malformed remote arguments', () => {
	it.each([
		['not base64', 'AAAA'],
		['a stray percent', '%'],
		['not JSON', Buffer.from('not JSON').toString('base64url')],
		['JSON but not devalue', Buffer.from('[{"x":999}]').toString('base64url')],
		['an unknown devalue type', Buffer.from('[["Nope",1]]').toString('base64url')]
	])('is a client error for %s', (_, payload) => {
		const request = new Request(`${QUERY}?payload=${encodeURIComponent(payload)}`);
		expect(isMalformedClientInput(kitDecodeError(payload), request)).toBe(true);
	});

	it.each([['01m5a4te7kpbqedtvncyxkx1gn'], [{ series: 'open', minMatchCount: 3 }], [42], [null]])(
		'treats an argument Kit encoded as decodable: %j',
		(value) => {
			const payload = stringifyRemoteArg(value);
			expect(parseRemoteArg(payload)).toEqual(value);
			expect(remotePayloadIsJson(payload)).toBe(true);
		}
	);

	// The callback ran, so whatever it threw is ours to report.
	it.each([
		new SyntaxError('Unexpected token < in upstream JSON'),
		new TypeError('Cannot read properties of undefined'),
		new Error('connection refused')
	])('reports %s from a query with a valid argument', (error) => {
		const request = new Request(`${QUERY}?payload=${stringifyRemoteArg('player-1')}`);
		expect(isMalformedClientInput(error, request)).toBe(false);
	});

	it('only applies to remote requests', () => {
		const error = kitDecodeError('AAAA');
		expect(
			isMalformedClientInput(error, new Request('https://example.org/events?payload=AAAA'))
		).toBe(false);
		expect(isMalformedClientInput(error, new Request(QUERY))).toBe(false);
	});
});

describe('malformed remote form bodies', () => {
	function kitFieldError(entries: [string, string][]): unknown {
		const data = new FormData();
		for (const [key, value] of entries) data.append(key, value);
		try {
			convertFormData('abc123/updateEvent', data);
		} catch (error) {
			return error;
		}
		throw new Error('Kit accepted the form');
	}
	const post = (url = FORM, type = 'multipart/form-data; boundary=x') =>
		new Request(url, { method: 'POST', headers: { 'content-type': type } });

	it.each([
		['an unbound field', [['name', 'x']]],
		[
			'a duplicated field',
			[
				['name/abc123/updateEvent', 'a'],
				['name/abc123/updateEvent', 'b']
			]
		],
		['a prototype-pollution key', [['__proto__.polluted/abc123/updateEvent', 'x']]]
	] as [string, [string, string][]][])('is a client error for %s', (_, entries) => {
		const error = kitFieldError(entries);
		expect(isMalformedClientInput(error, post())).toBe(true);
		// Kit's production wording is the bare documented URL.
		const code = (error as Error).message.match(/form_field_\w+$/)![0];
		expect(isMalformedClientInput(new Error(`https://svelte.dev/e/kit/${code}`), post())).toBe(
			true
		);
	});

	it('does not take a message that only mentions a Kit code for the diagnostic', () => {
		for (const message of [
			'value "https://svelte.dev/e/kit/form_field_unbound" rejected',
			'form_field_duplicate\nx\nhttps://svelte.dev/e/kit/form_field_unbound'
		]) {
			expect(isMalformedClientInput(new Error(message), post())).toBe(false);
		}
	});

	it('is a client error when a multipart body does not parse', async () => {
		const request = new Request(FORM, {
			method: 'POST',
			headers: { 'content-type': 'multipart/form-data; boundary=missing' },
			body: 'broken multipart'
		});
		const error = await request
			.clone()
			.formData()
			.then(
				() => expect.fail('Node parsed a broken body'),
				(error: unknown) => error
			);
		expect(isMalformedClientInput(error, request)).toBe(true);
		expect(isMalformedClientInput(error, new Request('https://example.org/events', request))).toBe(
			false
		);
	});

	it('is a client error when a binary form header is not devalue', () => {
		const error = kitDecodeError(Buffer.from('[{"x":999}]').toString('base64url'));
		expect(isMalformedClientInput(error, post(FORM, 'application/x-sveltekit-formdata'))).toBe(
			true
		);
	});

	it('reports a form callback fault', () => {
		for (const error of [
			new TypeError('x is undefined'),
			new SyntaxError('bad'),
			new Error('boom')
		]) {
			expect(isMalformedClientInput(error, post())).toBe(false);
			expect(isMalformedClientInput(error, post(FORM, 'application/x-sveltekit-formdata'))).toBe(
				false
			);
		}
	});
});
