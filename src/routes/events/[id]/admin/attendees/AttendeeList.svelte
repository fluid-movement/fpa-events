<script lang="ts">
	import DataList, { type DataColumn } from '#lib/components/layout/DataList.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { Attendee } from '#lib/types/event';

	interface Props {
		attendees: Attendee[];
	}

	let { attendees }: Props = $props();

	const columns: DataColumn<Attendee>[] = [
		{ header: 'Name', value: (a) => a.name, slot: 'primary' },
		// The layout load has always selected `user.email` for this list and
		// nothing rendered it. Organizers need a way to contact who is coming —
		// it is the one thing the manage area has that the public page must not.
		{ header: 'Email', value: (a) => a.email, slot: 'subtitle' },
		{
			header: 'Status',
			value: (a) => a.status,
			slot: 'meta',
			// Statuses are lowercase in the database ('attending', 'organizing').
			cellClass: () => 'capitalize',
			headerClass: 'w-32'
		}
	];
</script>

<DataList rows={attendees} {columns} getKey={(a) => a.id}>
	{#snippet empty()}
		<EmptyState
			icon={UsersIcon}
			title="No attendees yet"
			description="People who RSVP on the public page show up here."
		/>
	{/snippet}
</DataList>
