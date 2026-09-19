<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import MapPinOffIcon from '@lucide/svelte/icons/map-pin-off';
</script>

<PageShell width="form">
	<!-- A 404 gets its own copy rather than echoing the framework's "Not found",
	     which would just say the same thing twice under the heading. -->
	<EmptyState
		icon={page.status === 404 ? MapPinOffIcon : TriangleAlertIcon}
		title={page.status === 404 ? 'Page not found' : 'Something went wrong'}
		description={page.status === 404
			? "The page you're looking for doesn't exist, or the link may be out of date."
			: page.error?.message || 'An unexpected error occurred.'}
	>
		{#snippet action()}
			<Button href={resolve('/')}>Back to home</Button>
		{/snippet}
	</EmptyState>
</PageShell>
