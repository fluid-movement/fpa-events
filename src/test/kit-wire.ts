/**
 * Kit's own remote wire format, for tests that must break if it changes: the
 * client serialisers and the server decoders, imported from Kit's runtime rather
 * than copied. They are private (no export, no types), hence the paths.
 */
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as shared from '../../node_modules/@sveltejs/kit/src/runtime/shared.js';
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as formUtils from '../../node_modules/@sveltejs/kit/src/runtime/form-utils.js';

export { parseRemoteArg, deserializeBinaryForm } from '#lib/server/kit-decoders';

/** What the browser puts in `?payload=` for a remote query argument. */
export const stringifyRemoteArg: (value: unknown) => string = shared.stringify_remote_arg;

/** What an enhanced remote form posts as `application/x-sveltekit-formdata`. */
export const serializeBinaryForm: (
	data: Record<string, unknown>,
	meta: Record<string, unknown>
) => { blob: Blob } = formUtils.serialize_binary_form;

/** How the server maps a form body onto fields; throws on unbound/duplicate keys. */
export const convertFormData: (formId: string, data: FormData) => Record<string, unknown> =
	formUtils.convert_formdata;
