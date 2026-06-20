<script lang="ts">
	let { content, class: className = '' }: { content: string; class?: string } = $props();
</script>

<div class="rich-text {className}">{@html content}</div>
