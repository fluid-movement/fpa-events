/**
 * Kit's own server-side decoders for remote-function input, imported from its
 * runtime rather than copied, so re-running one decides exactly what Kit
 * decided. They are private (no export, no types), hence the paths.
 */
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as shared from '../../../node_modules/@sveltejs/kit/src/runtime/shared.js';
// @ts-expect-error -- Kit's private runtime ships no declarations
import * as formUtils from '../../../node_modules/@sveltejs/kit/src/runtime/form-utils.js';

/** Decodes a `?payload=` remote query argument; throws on a malformed one. */
export const parseRemoteArg: (payload: string) => unknown = shared.parse_remote_arg;

/**
 * Decodes a remote form body. Kit only uses the form id to map a non-binary
 * body onto fields; the binary format is decoded without it.
 */
export const deserializeBinaryForm: (
	request: Request,
	formId: string
) => Promise<{ data: Record<string, unknown>; meta: unknown; form_data: FormData | null }> =
	formUtils.deserialize_binary_form;

export const BINARY_FORM_CONTENT_TYPE: string = formUtils.BINARY_FORM_CONTENT_TYPE;
