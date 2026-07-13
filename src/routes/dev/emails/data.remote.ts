import * as v from 'valibot';
import { form } from '$app/server';
import { error } from '@sveltejs/kit';
import { sendTestEmail } from '$lib/server/email';

const schema = v.object({
	to: v.pipe(v.string(), v.email()),
	templateId: v.picklist(['activate-account', 'reset-password'])
});

export const sendTestEmailForm = form(schema, async (data) => {
	if (!import.meta.env.DEV) error(404, 'Not found');

	try {
		await sendTestEmail({ to: data.to, templateId: data.templateId });
		return { ok: true, to: data.to };
	} catch (err) {
		return { ok: false, error: (err as Error).message };
	}
});
