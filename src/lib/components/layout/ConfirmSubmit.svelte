<script lang="ts" generics="Input extends RemoteFormInput">
	import type { Snippet } from 'svelte';
	import type { RemoteForm, RemoteFormInput } from '$app/server';
	import ConfirmDialog, { type ConfirmTestIds } from './ConfirmDialog.svelte';

	let {
		open = $bindable(false),
		form,
		fields = {},
		closeOnConfirm = true,
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		confirmPhrase,
		phraseNoun = 'name',
		destructive = true,
		pendingLabel,
		testIds = {},
		trigger,
		body,
		icon
	}: {
		open?: boolean;
		/** The remote form this dialog submits. */
		form: RemoteForm<Input, unknown>;
		/** Hidden inputs to post with it. Reactive — read at submit time. */
		fields?: Record<string, string | number | null | undefined>;
		/**
		 * Whether confirming dismisses the dialog. Turn it off where the submit
		 * navigates away, so the dialog does not blink out before it does.
		 */
		closeOnConfirm?: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirmPhrase?: string;
		phraseNoun?: string;
		destructive?: boolean;
		pendingLabel?: string;
		testIds?: ConfirmTestIds;
		trigger?: Snippet;
		body?: Snippet;
		icon?: Snippet;
	} = $props();

	let formEl: HTMLFormElement | undefined = $state();

	function confirm() {
		formEl?.requestSubmit();
		if (closeOnConfirm) open = false;
	}
</script>

<!--
	Destructive actions all follow the same shape: a hidden remote form plus a
	dialog that submits it. The form lives outside the dialog because the confirm
	button renders into a portal, and it deliberately has no `onsubmit` of its own
	— defining one would replace the remote function's handler and fall back to a
	native submit.
-->
<form bind:this={formEl} {...form} class="hidden">
	{#each Object.entries(fields) as [name, value] (name)}
		<input type="hidden" {name} value={value ?? ''} />
	{/each}
</form>

<ConfirmDialog
	bind:open
	{title}
	{description}
	{confirmLabel}
	{cancelLabel}
	{confirmPhrase}
	{phraseNoun}
	{destructive}
	{pendingLabel}
	pending={form.pending > 0}
	{testIds}
	{trigger}
	{body}
	{icon}
	onconfirm={confirm}
/>
