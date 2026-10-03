<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type ChainedCommands } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { cn } from '#lib/utils';
	import type { RemoteFormField } from '$app/server';

	let {
		field,
		value = '',
		placeholder = 'Write something...'
	}: {
		// SvelteKit 3 rejects form fields not built by `fields.<name>.as(...)`,
		// so callers pass the field accessor rather than a bare name.
		field: RemoteFormField<string>;
		value?: string;
		placeholder?: string;
	} = $props();

	type ToolbarItem =
		| { separator: true }
		| {
				separator?: false;
				label: string;
				title: string;
				/** Extra classes that make the button preview its own effect. */
				class?: string;
				run: (chain: ChainedCommands) => ChainedCommands;
				/** Node or mark name, plus attributes, that lights the button up. */
				active: [name: string, attributes?: Record<string, unknown>];
		  };

	const TOOLBAR: ToolbarItem[] = [
		{
			label: 'B',
			title: 'Bold',
			class: 'font-bold',
			run: (c) => c.toggleBold(),
			active: ['bold']
		},
		{
			label: 'I',
			title: 'Italic',
			class: 'italic',
			run: (c) => c.toggleItalic(),
			active: ['italic']
		},
		{ separator: true },
		{
			label: 'H2',
			title: 'Heading 2',
			class: 'font-semibold',
			run: (c) => c.toggleHeading({ level: 2 }),
			active: ['heading', { level: 2 }]
		},
		{
			label: 'H3',
			title: 'Heading 3',
			class: 'font-semibold',
			run: (c) => c.toggleHeading({ level: 3 }),
			active: ['heading', { level: 3 }]
		},
		{ separator: true },
		{
			label: '• List',
			title: 'Bullet list',
			run: (c) => c.toggleBulletList(),
			active: ['bulletList']
		},
		{
			label: '1. List',
			title: 'Ordered list',
			run: (c) => c.toggleOrderedList(),
			active: ['orderedList']
		}
	];

	let element = $state<HTMLElement>();
	// Re-wrapped on every transaction because the Editor instance itself is not
	// reactive — replacing the holder is what re-runs the `isActive` checks below.
	let holder = $state<{ editor: Editor | null }>({ editor: null });

	const editor = $derived(holder.editor);
	const htmlContent = $derived(editor?.getHTML() ?? value);

	onMount(() => {
		holder = {
			editor: new Editor({
				element,
				extensions: [StarterKit],
				content: value,
				onTransaction: ({ editor }) => (holder = { editor })
			})
		};
	});

	onDestroy(() => holder.editor?.destroy());
</script>

<div class="rounded-md border">
	<div class="flex flex-wrap gap-1 rounded-t-md border-b bg-muted/40 p-2">
		{#each TOOLBAR as item, i (i)}
			{#if item.separator}
				<div class="my-1 w-px bg-border"></div>
			{:else}
				<button
					type="button"
					title={item.title}
					class={cn(
						'rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
						item.class,
						editor?.isActive(item.active[0], item.active[1]) && 'bg-accent'
					)}
					onclick={(e) => {
						// Keep focus in the editor: a default-submitting button would blur
						// it and lose the selection the command applies to.
						e.preventDefault();
						if (editor) item.run(editor.chain().focus()).run();
					}}
				>
					{item.label}
				</button>
			{/if}
		{/each}
	</div>

	<div
		bind:this={element}
		class="rich-text min-h-32 px-3 py-2 outline-none"
		data-placeholder={placeholder}
	></div>
</div>

<!-- Hidden input for form submission -->
<input {...field.as('hidden', htmlContent)} />

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 8rem;
	}
	:global(.ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--muted-foreground);
		pointer-events: none;
		height: 0;
	}
</style>
