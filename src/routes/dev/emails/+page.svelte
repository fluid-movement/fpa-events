<script lang="ts">
	import { emailTemplates } from '$lib/email/templates';
	import { sendTestEmailForm } from './data.remote';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let selectedId = $state<'activate-account' | 'reset-password'>('activate-account');
	let showSource = $state(false);

	const current = $derived(emailTemplates.find((t) => t.id === selectedId)!);
	const html = $derived(current.render());
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Email Preview</h1>
		<p class="text-sm text-muted-foreground">
			Preview and test email templates. This route is only available in development.
		</p>
	</div>

	<div class="flex gap-2">
		{#each emailTemplates as tpl (tpl.id)}
			{@const active = tpl.id === selectedId}
			<button
				type="button"
				data-testid="template-tab-{tpl.id}"
				class="rounded-md border px-4 py-2 text-sm font-medium transition-colors {active
					? 'bg-foreground text-background'
					: 'text-muted-foreground hover:bg-accent'}"
				onclick={() => (selectedId = tpl.id)}
			>
				{tpl.name}
			</button>
		{/each}
	</div>

	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold">{current.name}</h2>
		<Button
			type="button"
			variant="outline"
			size="sm"
			data-testid="toggle-source"
			onclick={() => (showSource = !showSource)}
		>
			{showSource ? 'Preview' : 'View Source'}
		</Button>
	</div>

	<div class="overflow-hidden rounded-lg border bg-white">
		<h3 class="border-b px-4 py-2 text-sm font-medium text-muted-foreground">
			Subject: {current.subject}
		</h3>
		{#if showSource}
			<pre
				data-testid="email-source"
				class="max-h-[60vh] overflow-auto p-4 text-xs break-all whitespace-pre-wrap">{html}</pre>
		{:else}
			<iframe
				data-testid="email-preview"
				title="Email preview"
				srcdoc={html}
				class="h-[60vh] w-full border-0"
			></iframe>
		{/if}
	</div>

	<div class="max-w-sm space-y-3 rounded-lg border p-4">
		<h3 class="text-sm font-semibold">Send test email</h3>
		<form {...sendTestEmailForm} class="space-y-3">
			<div class="space-y-1.5">
				<Label for="test-email">Recipient</Label>
				<Input
					id="test-email"
					placeholder="you@example.com"
					{...sendTestEmailForm.fields.to.as('email')}
					data-testid="test-email-input"
				/>
				{#each sendTestEmailForm.fields.to.issues() as issue (issue.message)}
					<p class="text-xs text-destructive">{issue.message}</p>
				{/each}
			</div>
			<input {...sendTestEmailForm.fields.templateId.as('hidden', selectedId)} />
			<Button type="submit" class="w-full" data-testid="send-test-email">Send</Button>
		</form>
		{#if sendTestEmailForm.result?.ok}
			<p class="text-sm text-green-600" data-testid="send-success">
				Sent to {sendTestEmailForm.result.to}
			</p>
		{:else if sendTestEmailForm.result && !sendTestEmailForm.result.ok}
			<p class="text-sm text-destructive" data-testid="send-error">
				{sendTestEmailForm.result.error}
			</p>
		{/if}
	</div>
</div>
