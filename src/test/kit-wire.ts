/**
 * Kit's own remote wire format, for tests that must break if it changes: the
 * client serialiser and the server decoders, imported from Kit's runtime rather
 * than copied. They are private (no export, no types), hence the paths.
 */
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as shared from '../../node_modules/@sveltejs/kit/src/runtime/shared.js';
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as formUtils from '../../node_modules/@sveltejs/kit/src/runtime/form-utils.js';

/** What the browser puts in `?payload=` for a remote query argument. */
export const stringifyRemoteArg: (value: unknown) => string = shared.stringify_remote_arg;

/** How the server decodes that payload; throws on a malformed one. */
export const parseRemoteArg: (payload: string) => unknown = shared.parse_remote_arg;

/** How the server maps a form body onto fields; throws on unbound/duplicate keys. */
export const convertFormData: (formId: string, data: FormData) => Record<string, unknown> =
	formUtils.convert_formdata;
