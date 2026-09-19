<script lang="ts" module>
	export type ConfirmTestIds = {
		content?: string;
		input?: string;
		confirm?: string;
		cancel?: string;
		phrase?: string;
		phraseCopy?: string;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as AlertDialog from '#lib/components/ui/alert-dialog';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import CopyField from './CopyField.svelte';
	import { cn } from '#lib/utils';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		/** Require the exact phrase to be typed before confirming — for the
		 *  irreversible things (deleting an event, deleting an account). */
		confirmPhrase,
		phraseNoun = 'name',
		destructive = true,
		pending = false,
		pendingLabel,
		class: className,
		testIds = {},
		trigger,
		body,
		icon,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirmPhrase?: string;
		/** What the phrase is, for the instruction copy: "type the event name". */
		phraseNoun?: string;
		destructive?: boolean;
		pending?: boolean;
		pendingLabel?: string;
		class?: string;
		testIds?: ConfirmTestIds;
		/** Opens the dialog. Omit to drive `open` yourself. */
		trigger?: Snippet;
		/** Extra content between the description and the confirmation field. */
		body?: Snippet;
		/** Leading icon inside the confirm button. */
		icon?: Snippet;
		onconfirm?: () => void;
	} = $props();

	let typed = $state('');

	// Re-arm every time the dialog closes, so a previous attempt can't carry over.
	$effect(() => {
		if (!open) typed = '';
	});

	const armed = $derived(!confirmPhrase || typed.trim() === confirmPhrase.trim());
</script>

<AlertDialog.Root bind:open>
	{#if trigger}
		<AlertDialog.Trigger>
			{@render trigger()}
		</AlertDialog.Trigger>
	{/if}
	<AlertDialog.Content class={cn('sm:max-w-md', className)} data-testid={testIds.content}>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			{#if description}
				<AlertDialog.Description>{description}</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>

		{#if body}
			{@render body()}
		{/if}

		{#if confirmPhrase}
			<div class="space-y-2">
				<!-- Single child: Label lays its children out with `flex gap-2`, which
				     would otherwise add visible gaps around the emphasised span. -->
				<Label for="confirm-phrase">
					<span>
						To confirm, type
						<span class="font-semibold text-foreground">{confirmPhrase}</span> below.
					</span>
				</Label>

				<CopyField
					value={confirmPhrase}
					ariaLabel="Event {phraseNoun} to copy"
					copyTitle="Copy event {phraseNoun}"
					data-testid={testIds.phrase}
					copyTestId={testIds.phraseCopy}
				/>

				<Input
					id="confirm-phrase"
					bind:value={typed}
					placeholder="Type the event {phraseNoun}"
					autocomplete="off"
					autocorrect="off"
					spellcheck={false}
					class="font-mono text-xs"
					data-testid={testIds.input}
				/>
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel type="button" data-testid={testIds.cancel}>
				{cancelLabel}
			</AlertDialog.Cancel>
			<Button
				variant={destructive ? 'destructive' : 'default'}
				disabled={!armed || pending}
				data-testid={testIds.confirm}
				onclick={() => onconfirm?.()}
			>
				{#if icon}{@render icon()}{/if}
				{pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
