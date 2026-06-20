<script lang="ts">
	interface Attendee {
		id: number;
		name: string;
		email: string;
		status: string;
	}

	interface Props {
		attendees: Attendee[];
	}

	let { attendees }: Props = $props();
</script>

{#if attendees.length === 0}
	<p class="py-8 text-center text-muted-foreground">No attendees yet.</p>
{:else}
	<div class="overflow-hidden rounded-lg border">
		<table class="w-full text-sm">
			<thead class="bg-muted/50">
				<tr>
					<th class="px-4 py-3 text-left font-medium">Name</th>
					<th class="px-4 py-3 text-left font-medium">Email</th>
					<th class="px-4 py-3 text-left font-medium">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each attendees as attendee (attendee.id)}
					<tr class="border-t">
						<td class="px-4 py-3">{attendee.name}</td>
						<td class="px-4 py-3 text-muted-foreground">{attendee.email}</td>
						<td class="px-4 py-3 capitalize">{attendee.status}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
