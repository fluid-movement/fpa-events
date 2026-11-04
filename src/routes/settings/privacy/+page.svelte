<script lang="ts">
	import { tick } from 'svelte';
	import { Switch } from '#lib/components/ui/switch';
	import { Label } from '#lib/components/ui/label';
	import Section from '#lib/components/layout/Section.svelte';
	import { getPrivacySettings, setShowName } from './data.remote';

	const settings = $derived(await getPrivacySettings());

	let formEl: HTMLFormElement;

	// Writable derived: the switch responds instantly to a local assignment, and
	// the query takes back over once the save round-trips.
	let showName = $derived(settings.showName);
</script>

<Section title="Privacy" description="Control what others can see about you.">
	<form {...setShowName} bind:this={formEl}>
		<input
			{...setShowName.fields.showName.as(
				'hidden',
				String(showName) as 'true' | 'false'
			)}
		/>
		<div class="surface flex items-start justify-between gap-4 rounded-xl p-4 md:gap-6">
			<div class="space-y-1">
				<Label for="show-name" class="text-sm font-medium">Show my name in event attendee lists and crew member lists</Label>
				<p class="text-sm text-muted-foreground">
					When this is off you're still counted as attending — you just appear in the “and N others”
					total instead of by name. Event organizers can always see your name. Only the event owner
					and site admins can see your email address in the manage area; co-organizers see names
					only.
				</p>
			</div>
			<!-- Take the new value from the callback argument and wait for the DOM to
			     flush: `onCheckedChange` fires before a `bind:checked` write reaches the
			     hidden input, so submitting immediately would post the previous value. -->
			<Switch
				id="show-name"
				checked={showName}
				onCheckedChange={async (checked) => {
					showName = checked;
					await tick();
					formEl.requestSubmit();
				}}
				data-testid="show-name-switch"
			/>
		</div>
	</form>
</Section>
