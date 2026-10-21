import { afterEach, describe, expect, it, vi } from 'vitest';
import { format } from 'node:util';
import { DrizzleQueryError } from 'drizzle-orm';
import { auth } from './auth';

afterEach(() => {
	vi.restoreAllMocks();
});

// Better Auth logs the raw error when a session lookup fails, and Drizzle's
// message lists the query's parameters: here, the session token.
describe('Better Auth logging', () => {
	it('never prints a failed query parameter', async () => {
		const token = 'CANARY_session_token_value';
		const error = new DrizzleQueryError(
			'select * from "session" where "token" = $1',
			[token],
			new Error('connection reset')
		);
		const printed = vi.spyOn(console, 'error').mockImplementation(() => {});

		(await auth.$context).logger.error('INTERNAL_SERVER_ERROR', error);

		expect(printed).toHaveBeenCalledOnce();
		// What the console would actually print, error objects included.
		const output = printed.mock.calls.map((call) => format(...call)).join('\n');
		expect(output).toContain('Failed query: select');
		expect(output).not.toContain(token);
		expect(output).not.toContain('params:');
	});
});
