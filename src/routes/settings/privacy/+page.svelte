<script lang="ts">
	import { tick } from 'svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { getPrivacySettings, setShowAttendance } from './data.remote';

	const settings = $derived(await getPrivacySettings());

	let formEl: HTMLFormElement;

	// Local mirror so the switch responds instantly; the query is the source of
	// truth once the save round-trips.
	let showAttendance = $state(true);
	$effect(() => {
		showAttendance = settings.showAttendance;
	});
</script>

<div class="space-y-6">
	<div class="space-y-1">
		<h2 class="text-lg font-semibold">Privacy</h2>
		<p class="text-sm text-muted-foreground">Control what others can see about you.</p>
	</div>

	<form {...setShowAttendance} bind:this={formEl}>
		<input type="hidden" name="showAttendance" value={String(showAttendance)} />
		<div class="flex items-start justify-between gap-6 rounded-lg border p-4">
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
</div>
