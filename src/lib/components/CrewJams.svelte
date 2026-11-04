<script lang="ts">
	import { formatJamWeekday, formatJamTime } from '#lib/utils/dates';
	import type { crewJams } from '#lib/server/db/schema';
	let { jams }: { jams: (typeof crewJams.$inferSelect)[] } = $props();
</script>

{#if jams.length}
	<section aria-label="Regular jams" class="flex flex-col gap-4" data-testid="crew-jams">
		<h2>Regular jams</h2>
		<ul class="flex flex-col gap-4">
			{#each jams as jam (jam.id)}
				<li data-testid={`crew-jam-${jam.id}`}>
					<p>
						{formatJamWeekday(jam.weekday)}
						{formatJamTime(jam.startTime)} —
						{#if jam.latitude !== null && jam.longitude !== null}
							<a
								href={`https://www.openstreetmap.org/?mlat=${jam.latitude}&mlon=${jam.longitude}#map=16/${jam.latitude}/${jam.longitude}`}
								target="_blank"
								rel="noopener noreferrer">{jam.venueName}</a
							>
						{:else}{jam.venueName}{/if}
					</p>
					{#if jam.address}<p>{jam.address}</p>{/if}
					{#if jam.note}<p>{jam.note}</p>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
