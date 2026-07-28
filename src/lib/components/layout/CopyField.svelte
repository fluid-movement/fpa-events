<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn } from '$lib/utils';

	let {
		value,
		label,
		ariaLabel,
		description,
		class: className,
		'data-testid': testId,
		copyTestId,
		copyTitle = 'Copy'
	}: {
		value: string;
		label?: string;
		/** For when the field has no visible label of its own. */
		ariaLabel?: string;
		description?: string;
		class?: string;
		'data-testid'?: string;
		copyTestId?: string;
		copyTitle?: string;
	} = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard is blocked (insecure origin, denied permission) — the value
			// is selectable in the field, so there's still a way through.
			copied = false;
		}
	}

	$effect(() => () => clearTimeout(timer));
</script>

<div class={cn('space-y-2', className)}>
	{#if label}
		<Label>{label}</Label>
	{/if}
	<div class="flex gap-2">
		<!-- Readonly rather than disabled: the text stays selectable and copyable
		     by hand when the clipboard API isn't available. -->
		<input
			readonly
			{value}
			aria-label={ariaLabel}
			data-testid={testId}
			class="surface-sunken h-11 min-w-0 flex-1 truncate rounded-md px-3 font-mono text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-9"
			onfocus={(e) => e.currentTarget.select()}
		/>
		<Button variant="outline" size="icon" onclick={copy} title={copyTitle} data-testid={copyTestId}>
			{#if copied}
				<CheckIcon class="text-success" />
			{:else}
				<CopyIcon />
			{/if}
			<span class="sr-only">{copied ? 'Copied' : 'Copy'}</span>
		</Button>
	</div>
	{#if description}
		<p class="text-xs text-muted-foreground">{description}</p>
	{/if}
</div>
