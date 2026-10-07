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
