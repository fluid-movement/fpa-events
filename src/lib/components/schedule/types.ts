/**
 * The fields both schedule forms post.
 *
 * Lives here rather than inside `ScheduleItemForm.svelte` because a component's
 * `generics` attribute cannot reference a type declared in its own instance
 * script. Narrower than `RemoteFormInput` because SvelteKit 3 builds each input
 * from `fields.<name>.as(...)`, so the generic has to promise those names
 * exist. `id` is optional: only the edit form carries one, and the template
 * renders it only in edit mode.
 */
export type ScheduleFormInput = {
	eventId: string;
	name: string;
	startDate: string;
	endDate: string;
	locationId?: string;
	description?: string;
	id?: string;
};
