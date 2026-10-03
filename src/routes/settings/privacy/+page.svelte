<script lang="ts">
	import { tick } from 'svelte';
	import { Switch } from '#lib/components/ui/switch';
	import { Label } from '#lib/components/ui/label';
	import Section from '#lib/components/layout/Section.svelte';
	import { getPrivacySettings, setShowAttendance } from './data.remote';

	const settings = $derived(await getPrivacySettings());

	let formEl: HTMLFormElement;

	// Writable derived: the switch responds instantly to a local assignment, and
	// the query takes back over once the save round-trips.
	let showAttendance = $derived(settings.showAttendance);
</script>

<Section title="Privacy" description="Control what others can see about you.">
	<form {...setShowAttendance} bind:this={formEl}>
		<input
			{...setShowAttendance.fields.showAttendance.as(
				'hidden',
				String(showAttendance) as 'true' | 'false'
			)}
		/>
		<div class="surface flex items-start justify-between gap-4 rounded-xl p-4 md:gap-6">
			<div class="space-y-1">
				<Label for="show-attendance" class="text-sm font-medium">Show my name on event pages</Label>
				<p class="text-sm text-muted-foreground">
					When this is off you're still counted as attending — you just appear in the “and N others”
					total instead of by name. Event organizers can always see who has signed up.
				</p>
			</div>
			<!-- Take the new value from the callback argument and wait for the DOM to
			     flush: `onCheckedChange` fires before a `bind:checked` write reaches the
			     hidden input, so submitting immediately would post the previous value. -->
			<Switch
				id="show-attendance"
				checked={showAttendance}
				onCheckedChange={async (checked) => {
					showAttendance = checked;
					await tick();
					formEl.requestSubmit();
				}}
				data-testid="show-attendance-switch"
			/>
		</div>
	</form>
</Section>
