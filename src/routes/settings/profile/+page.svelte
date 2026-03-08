<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<form method="POST" class="space-y-4">
	<div class="grid gap-2">
		<Label for="name">Name</Label>
		<Input id="name" name="name" type="text" required value={data.name} />
	</div>
	<div class="grid gap-2">
		<Label for="email">Email</Label>
		<Input id="email" type="email" value={data.email} disabled />
		<p class="text-xs text-muted-foreground">Email cannot be changed here.</p>
	</div>

	{#if form?.error}
		<p class="text-sm text-destructive">{form.error}</p>
	{/if}
	{#if form?.success}
		<p class="text-sm text-green-600">Profile updated.</p>
	{/if}

	<Button type="submit">Save</Button>
</form>
