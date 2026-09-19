<script lang="ts" generics="Input extends RemoteFormInput">
	import type { Snippet } from 'svelte';
	import type { RemoteForm, RemoteFormInput, RemoteFormField } from '$app/server';
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

	/**
	 * SvelteKit 3 rejects any form field not built by `fields.<name>.as(...)` —
	 * it encodes the form id and a type prefix into the field's `name`. `form`
	 * is generic here, so its fields object cannot be indexed by an arbitrary
	 * key at the type level; at runtime it is a proxy that accepts any name.
	 * Callers keep passing a plain `{ name: value }` map.
	 */
	const fieldsProxy = $derived(
		form.fields as unknown as Record<string, RemoteFormField<string> | undefined>
	);

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
		<input {...fieldsProxy[name]!.as('hidden', value == null ? '' : String(value))} />
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
