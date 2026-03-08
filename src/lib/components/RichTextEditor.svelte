<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';

	let {
		name,
		value = '',
		placeholder = 'Write something...'
	}: { name: string; value?: string; placeholder?: string } = $props();

	let element = $state<HTMLElement>();
	let editorState = $state<{ editor: Editor | null }>({ editor: null });
	let htmlContent = $state(value);

	onMount(() => {
		editorState.editor = new Editor({
			element,
			extensions: [StarterKit],
			content: value,
			onTransaction: ({ editor }) => {
				editorState = { editor };
				htmlContent = editor.getHTML();
			}
		});
	});

	onDestroy(() => editorState.editor?.destroy());

	function btn(action: () => void) {
		return (e: Event) => {
			e.preventDefault();
			action();
		};
	}
</script>

<div class="rounded-md border">
	<!-- Toolbar -->
	<div class="flex flex-wrap gap-1 rounded-t-md border-b bg-muted/40 p-2">
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleBold().run())}
			class="rounded px-2 py-1 text-sm font-bold transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('bold')}
			title="Bold"
		>
			B
		</button>
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleItalic().run())}
			class="rounded px-2 py-1 text-sm italic transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('italic')}
			title="Italic"
		>
			I
		</button>
		<div class="my-1 w-px bg-border"></div>
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleHeading({ level: 2 }).run())}
			class="rounded px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('heading', { level: 2 })}
			title="Heading 2"
		>
			H2
		</button>
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleHeading({ level: 3 }).run())}
			class="rounded px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('heading', { level: 3 })}
			title="Heading 3"
		>
			H3
		</button>
		<div class="my-1 w-px bg-border"></div>
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleBulletList().run())}
			class="rounded px-2 py-1 text-sm transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('bulletList')}
			title="Bullet list"
		>
			• List
		</button>
		<button
			type="button"
			onclick={btn(() => editorState.editor?.chain().focus().toggleOrderedList().run())}
			class="rounded px-2 py-1 text-sm transition-colors hover:bg-accent"
			class:bg-accent={editorState.editor?.isActive('orderedList')}
			title="Ordered list"
		>
			1. List
		</button>
	</div>

	<!-- Editor content area -->
	<div
		bind:this={element}
		class="rich-text min-h-32 px-3 py-2 outline-none"
		data-placeholder={placeholder}
	></div>
</div>

<!-- Hidden input for form submission -->
<input type="hidden" {name} value={htmlContent} />

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
