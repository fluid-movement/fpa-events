<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { CopyToClipboard } from '$lib/hooks/copy-to-clipboard.svelte';
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

	const clipboard = new CopyToClipboard();
	$effect(() => () => clipboard.dispose());
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
		<Button
			variant="outline"
			size="icon"
			onclick={() => clipboard.write(value)}
			title={copyTitle}
			data-testid={copyTestId}
		>
			{#if clipboard.copied}
				<CheckIcon class="text-success" />
			{:else}
				<CopyIcon />
			{/if}
			<span class="sr-only">{clipboard.copied ? 'Copied' : 'Copy'}</span>
		</Button>
	</div>
	{#if description}
		<p class="text-xs text-muted-foreground">{description}</p>
	{/if}
</div>
