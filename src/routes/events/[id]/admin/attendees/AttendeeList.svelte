<script lang="ts">
	import DataList, { type DataColumn } from '#lib/components/layout/DataList.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { Attendee } from '#lib/types/event';

	interface Props {
		attendees: Attendee[];
		showEmails: boolean;
	}

	let { attendees, showEmails }: Props = $props();

	const columns: DataColumn<Attendee>[] = $derived([
		{ header: 'Name', value: (a) => a.name, slot: 'primary' },
		...(showEmails
			? [{ header: 'Email', value: (a: Attendee) => a.email, slot: 'subtitle' as const }]
			: []),
		{
			header: 'Status',
			value: (a) => a.status,
			slot: 'meta',
			// Statuses are lowercase in the database ('attending', 'organizing').
			cellClass: () => 'capitalize',
			headerClass: 'w-32'
		}
	]);
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
