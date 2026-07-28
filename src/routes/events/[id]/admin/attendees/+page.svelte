<script lang="ts">
	import AttendeeList from './AttendeeList.svelte';
	import type { PageProps } from './$types';

	// Attendees come from the layout load — the Invites tab and the tab-label count
	// need the same rows.
	let { data }: PageProps = $props();
	const attendees = $derived(data.attendees);
</script>

<AttendeeList {attendees} />
