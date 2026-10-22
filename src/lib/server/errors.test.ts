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

// Kit's own client serialisers and server decoders, not copies of them: if Kit
// changes its wire format these fail instead of production requests.
import {
	convertFormData,
	deserializeBinaryForm,
	parseRemoteArg,
	serializeBinaryForm,
	stringifyRemoteArg
} from '../../test/kit-wire';
import { isMalformedClientInput, isMisroutedRemotePayload, keepRemoteFormBody } from './errors';

const QUERY = 'https://example.org/_app/remote/abc123/getPlayerProfile';
const FORM = 'https://example.org/_app/remote/abc123/updateEvent';
const BINARY = 'application/x-sveltekit-formdata';
const b64 = (text: string) => Buffer.from(text).toString('base64url');

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
		['not JSON', b64('not JSON')],
		['JSON but not devalue', b64('[{"x":999}]')],
		['an unknown devalue type', b64('[["Nope",1]]')],
		// Thrown by the revivers, not by devalue itself, and not as plain Errors.
		['an invalid BigInt', b64('[["BigInt","x"]]')],
		['an invalid RegExp', b64('[["RegExp","(",""]]')],
		['an invalid URL', b64('[["URL","not a url"]]')],
		['a typed array pointing nowhere', b64('[["Uint8Array",5]]')],
		['a typed array pointing at a string', b64('[["Uint8Array",1],"x"]')]
	])('is a client error for %s', async (_, payload) => {
		const request = new Request(`${QUERY}?payload=${encodeURIComponent(payload)}`);
		expect(await isMalformedClientInput(kitDecodeError(payload), request)).toBe(true);
	});

	it.each([['01m5a4te7kpbqedtvncyxkx1gn'], [{ series: 'open', minMatchCount: 3 }], [42], [null]])(
		'treats an argument Kit encoded as decodable: %j',
		async (value) => {
			const payload = stringifyRemoteArg(value);
			expect(parseRemoteArg(payload)).toEqual(value);
			const request = new Request(`${QUERY}?payload=${payload}`);
			expect(await isMalformedClientInput(new Error('Invalid input'), request)).toBe(false);
		}
	);

	// The argument decodes, so the callback ran and whatever it threw is ours to
	// report — even when it looks exactly like one of the decoder's own errors.
	it.each([
		new Error('Invalid input'),
		new Error('Invalid data'),
		new SyntaxError('Cannot convert x to a BigInt'),
		new TypeError('Invalid URL'),
		new TypeError('Cannot read properties of undefined'),
		new Error('connection refused')
	])('reports %s from a query with a valid argument', async (error) => {
		const request = new Request(`${QUERY}?payload=${stringifyRemoteArg('player-1')}`);
		expect(await isMalformedClientInput(error, request)).toBe(false);
	});

	it('only applies to remote requests', async () => {
		const error = kitDecodeError('AAAA');
		expect(
			await isMalformedClientInput(error, new Request('https://example.org/events?payload=AAAA'))
		).toBe(false);
		expect(await isMalformedClientInput(error, new Request(QUERY))).toBe(false);
	});

	// Kit decodes a query's payload whatever the method; `handle` refuses every
	// method but GET, so the classifier never has to guess what a POST was.
	it.each(['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])(
		'refuses a payload sent with %s',
		(method) => {
			expect(isMisroutedRemotePayload(new Request(`${QUERY}?payload=AAAA`, { method }))).toBe(true);
		}
	);
	it('lets GET queries, payload-free POSTs and ordinary pages through', () => {
		expect(isMisroutedRemotePayload(new Request(`${QUERY}?payload=AAAA`))).toBe(false);
		expect(isMisroutedRemotePayload(new Request(FORM, { method: 'POST' }))).toBe(false);
		expect(
			isMisroutedRemotePayload(
				new Request('https://example.org/events?payload=x', { method: 'POST' })
			)
		).toBe(false);
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
	const post = (url = FORM, type = 'multipart/form-data; boundary=x', body?: BodyInit) =>
		new Request(url, { method: 'POST', headers: { 'content-type': type }, body });

	/** A body as `handle` sees it: copied first, then read by Kit's decoder. */
	async function decodedByKit(request: Request): Promise<unknown> {
		keepRemoteFormBody(request);
		try {
			await deserializeBinaryForm(request, 'abc123/updateEvent');
		} catch (error) {
			return error;
		}
		return null;
	}

	/** A binary form whose fixed header is valid, followed by `text` as its data. */
	function binaryBody(text: string): Uint8Array<ArrayBuffer> {
		const data = Buffer.from(text);
		const header = Buffer.alloc(7);
		header.writeUInt32LE(data.length, 1);
		return new Uint8Array(Buffer.concat([header, data]));
	}

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
	] as [string, [string, string][]][])('is a client error for %s', async (_, entries) => {
		const error = kitFieldError(entries);
		expect(await isMalformedClientInput(error, post())).toBe(true);
		// Kit's production wording is the bare documented URL.
		const code = (error as Error).message.match(/form_field_\w+$/)![0];
		expect(
			await isMalformedClientInput(new Error(`https://svelte.dev/e/kit/${code}`), post())
		).toBe(true);
	});

	it('does not take a message that only mentions a Kit code for the diagnostic', async () => {
		for (const message of [
			'value "https://svelte.dev/e/kit/form_field_unbound" rejected',
			'form_field_duplicate\nx\nhttps://svelte.dev/e/kit/form_field_unbound'
		]) {
			expect(await isMalformedClientInput(new Error(message), post())).toBe(false);
		}
	});

	it('is a client error when a multipart body does not parse', async () => {
		const request = post(FORM, 'multipart/form-data; boundary=missing', 'broken multipart');
		const error = await decodedByKit(request);
		expect(error).toBeInstanceOf(TypeError);
		expect(await isMalformedClientInput(error, request)).toBe(true);
	});

	it.each([
		['malformed JSON', 'x'],
		['a null entry', '[null]'],
		['an object entry', '[{}]'],
		['JSON but not devalue', '[{"x":999}]']
	])('is a client error when a binary form header is %s', async (_, text) => {
		const request = post(FORM, BINARY, binaryBody(text));
		const error = await decodedByKit(request);
		expect(error).toBeInstanceOf(Error);
		expect(await isMalformedClientInput(error, request)).toBe(true);
	});

	it('is a client error on the no-JavaScript action URL too', async () => {
		const request = post(
			'https://example.org/events/x?/remote=abc123/updateEvent',
			BINARY,
			binaryBody('x')
		);
		expect(await isMalformedClientInput(await decodedByKit(request), request)).toBe(true);
	});

	// Kit decoded these bodies, so the callback ran and its error is reported,
	// even one worded exactly like a decoder failure.
	it.each([
		new Error('Invalid input'),
		new SyntaxError(`Unexpected token 'x', "x" is not valid JSON`),
		new TypeError('object null is not iterable (cannot read property Symbol(Symbol.iterator))'),
		new TypeError('Failed to parse body as FormData.'),
		new Error('boom')
	])('reports %s from a form whose body decoded', async (error) => {
		const { blob } = serializeBinaryForm({ name: 'Event' }, {});
		const binary = post(FORM, BINARY, blob);
		expect(await decodedByKit(binary)).toBeNull();
		expect(await isMalformedClientInput(error, binary)).toBe(false);

		const fields = new FormData();
		fields.set('name/abc123/updateEvent', 'Event');
		const multipart = new Request(FORM, { method: 'POST', body: fields });
		expect(await decodedByKit(multipart)).toBeNull();
		expect(await isMalformedClientInput(error, multipart)).toBe(false);
	});

	it('reports when no copy of the body was kept', async () => {
		const request = post(FORM, BINARY, binaryBody('x'));
		const error = await deserializeBinaryForm(request, '').catch((error: unknown) => error);
		expect(await isMalformedClientInput(error, request)).toBe(false);
	});
});
