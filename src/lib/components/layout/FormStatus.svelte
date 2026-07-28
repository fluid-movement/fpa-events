<script lang="ts">
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';

	let { error, success }: { error?: string | null; success?: string | null } = $props();
</script>

<!-- One place for form-level outcomes. `role` matters: a screen reader would
     otherwise never hear that a save succeeded. -->
{#if error}
	<p class="flex items-center gap-2 text-sm text-destructive" role="alert">
		<CircleAlertIcon class="size-4 shrink-0" />
		{error}
	</p>
{/if}
{#if success}
	<p class="flex items-center gap-2 text-sm text-success" role="status">
		<CircleCheckIcon class="size-4 shrink-0" />
		{success}
	</p>
{/if}
