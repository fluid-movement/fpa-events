<script lang="ts">
	import { Input } from '#lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		value: string;
		/** Result count, announced to screen readers as the list narrows. */
		resultCount: number;
		testId?: string;
	}

	let { value = $bindable(), resultCount, testId = 'player-search' }: Props = $props();

	let input = $state<HTMLInputElement | null>(null);

	function clear() {
		value = '';
		// Return focus so clearing does not drop the user out of the field.
		input?.focus();
	}
</script>

<div class="relative mb-4">
	<SearchIcon
		class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
	/>
	<label class="sr-only" for="{testId}-input">Search players by name</label>
	<!-- type="search" keeps the searchbox role for assistive tech, but WebKit
	     renders its own clear button which would sit right next to ours — the
	     arbitrary variant on `class` suppresses it. -->
	<Input
		id="{testId}-input"
		bind:ref={input}
		bind:value
		type="search"
		autocomplete="off"
		placeholder="Search players…"
		class="pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
		data-testid={testId}
	/>
	{#if value}
		<button
			type="button"
			onclick={clear}
			aria-label="Clear search"
			data-testid="{testId}-clear"
			class="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<XIcon class="size-4" />
		</button>
	{/if}
</div>

<!-- The table itself is not a live region, so announce the count instead. -->
<p class="sr-only" role="status" aria-live="polite">
	{#if value}
		{resultCount} player{resultCount === 1 ? '' : 's'} matching “{value}”
	{/if}
</p>
