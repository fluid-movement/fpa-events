<script lang="ts" module>
	// Every page picks one of these rather than inventing a max-width. Page
	// padding and the mobile tab-bar clearance live in the root layout's <main>.
	export const shellWidths = {
		/** Lists, dashboards, most content pages. */
		default: 'max-w-5xl',
		/** Reading and single-column detail — event page, admin area. */
		content: 'max-w-4xl',
		/** Forms and settings, where a short measure is easier to fill in. */
		form: 'max-w-2xl',
		/** Full bleed: maps, calendars, anything that wants the room. */
		full: 'max-w-none'
	} as const;

	export type ShellWidth = keyof typeof shellWidths;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		width = 'default',
		class: className,
		children
	}: {
		width?: ShellWidth;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class={cn('mx-auto w-full', shellWidths[width], className)}>
	{@render children()}
</div>
