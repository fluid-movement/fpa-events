<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LinkIcon from '@lucide/svelte/icons/link';
	import type { PageProps } from './$types';
	import { listEventLocations, createEventLocation, deleteEventLocation } from './locations.remote';
	import VenueLocationPicker from '$lib/components/VenueLocationPicker.svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const attendees = $derived(data.attendees);
	const schedules = $derived(data.schedules);
	const magicLink = $derived(data.magicLink);
	const origin = $derived(data.origin);
	const eventLat = $derived(data.eventLat ?? undefined);
	const eventLng = $derived(data.eventLng ?? undefined);

	let activeTab = $state<'attending' | 'schedule' | 'invite'>('attending');
	let editingId = $state<string | null>(null);
	let addingForDay = $state<string | null>(null);

	// Location picker state
	let showVenuePicker = $state(false);
	let selectedLocationId = $state<number | null>(null);

	const eventId = $derived(event.id);
	const eventLocationsList = $derived(await listEventLocations(eventId));

	const editingLocationId = $derived(
		editingId ? (schedules.find((s) => s.id === editingId)?.locationId ?? null) : null
	);

	$effect(() => {
		if (addingForDay === null) selectedLocationId = null;
	});

	// Auto-select newly created location
	let prevLocCount = $state(0);
	$effect(() => {
		const locs = eventLocationsList ?? [];
		if (locs.length > prevLocCount && locs.length > 0) {
			selectedLocationId = locs[locs.length - 1].id;
		}
		prevLocCount = locs.length;
	});

	// Day-picker state for add form
	let addSelectedDay = $state<string | null>(null);
	let addStartTime = $state('');
	let addEndTime = $state('');

	// Day-picker state for edit form
	let editSelectedDay = $state<string | null>(null);
	let editStartTime = $state('');
	let editEndTime = $state('');

	$effect(() => {
		if (addingForDay !== null) {
			addSelectedDay =
				addingForDay !== 'new' ? toISODate(new Date(addingForDay)) : (eventDays[0] ?? null);
			addStartTime = '';
			addEndTime = '';
		}
	});

	$effect(() => {
		if (editingId) {
			const item = schedules.find((s) => s.id === editingId);
			if (item) {
				editSelectedDay = toISODate(new Date(item.startDate));
				editStartTime = new Date(item.startDate).toTimeString().slice(0, 5);
				editEndTime = new Date(item.endDate).toTimeString().slice(0, 5);
			}
		}
	});

	function formatTime(d: Date) {
		return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatDayHeading(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	function toISODate(d: Date) {
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}

	function formatDayButton(isoDate: string) {
		return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	const eventDays = $derived.by(() => {
		const days: string[] = [];
		const cur = new Date(event.startDate);
		const end = new Date(event.endDate);
		while (cur <= end) {
			days.push(toISODate(cur));
			cur.setDate(cur.getDate() + 1);
		}
		return days;
	});

	const groupedSchedules = $derived.by(() => {
		const sorted = [...schedules].sort(
			(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		);
		const groups = new SvelteMap<string, typeof schedules>();
		for (const item of sorted) {
			const dayKey = new Date(item.startDate).toDateString();
			if (!groups.has(dayKey)) groups.set(dayKey, []);
			groups.get(dayKey)!.push(item);
		}
		return [...groups.entries()];
	});

	const magicLinkUrl = $derived(magicLink ? `${origin}/invite/${magicLink.id}` : null);
	const magicLinkExpired = $derived(magicLink ? new Date(magicLink.expiresAt) < new Date() : false);
	const organizers = $derived(
		attendees.filter((a) => a.status === 'organizing' && a.userId !== event.userId)
	);

	function hoursUntilExpiry(d: Date) {
		return Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60));
	}

	async function copyLink() {
		if (magicLinkUrl) await navigator.clipboard.writeText(magicLinkUrl);
	}
</script>

<div class="max-w-4xl mx-auto">
	<div class="mb-4 flex items-center justify-between">
		<Button href={resolve('/organizing')} variant="ghost" size="sm">
			<ArrowLeftIcon class="size-4" />
			Organizing
		</Button>
		<div class="flex gap-2">
			<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">View Event</Button>
			<Button href={resolve(`/events/${event.id}/edit`)} variant="outline" size="sm">
				Edit Event
			</Button>
		</div>
	</div>

	<div class="space-y-1 pb-6">
		<h1 class="text-2xl font-bold">{event.name}</h1>
		<p class="text-muted-foreground">Event Admin</p>
	</div>

	<!-- Tab bar -->
	<div class="mb-6 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
		<button
			onclick={() => (activeTab = 'attending')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'attending' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Attending ({attendees.length})
		</button>
		<button
			onclick={() => (activeTab = 'schedule')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'schedule' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Schedule ({schedules.length})
		</button>
		<button
			onclick={() => (activeTab = 'invite')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'invite' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Invite
		</button>
	</div>

	<!-- Attending tab -->
	{#if activeTab === 'attending'}
		{#if attendees.length === 0}
			<p class="text-muted-foreground py-8 text-center">No attendees yet.</p>
		{:else}
			<div class="rounded-lg border overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="px-4 py-3 text-left font-medium">Name</th>
							<th class="px-4 py-3 text-left font-medium">Email</th>
							<th class="px-4 py-3 text-left font-medium">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each attendees as attendee (attendee.id)}
							<tr class="border-t">
								<td class="px-4 py-3">{attendee.name}</td>
								<td class="px-4 py-3 text-muted-foreground">{attendee.email}</td>
								<td class="px-4 py-3 capitalize">{attendee.status}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

	<!-- Schedule tab -->
	{:else if activeTab === 'schedule'}
		<!-- Locations section -->
		<div class="mb-8">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-semibold">Locations</h2>
				<Button variant="outline" size="sm" onclick={() => (showVenuePicker = true)}>
					<PlusIcon class="size-4" />
					Add Location
				</Button>
			</div>
			{#if (eventLocationsList ?? []).length === 0}
				<p class="text-sm text-muted-foreground">No locations yet.</p>
			{:else}
				<div class="rounded-lg border divide-y">
					{#each eventLocationsList ?? [] as loc (loc.id)}
						<div class="flex items-center justify-between px-4 py-2.5 gap-4">
							<div class="min-w-0">
								<p class="text-sm font-medium">{loc.name}</p>
								{#if loc.address}
									<p class="text-xs text-muted-foreground truncate">{loc.address}</p>
								{/if}
							</div>
							<form {...deleteEventLocation}>
								<input type="hidden" name="id" value={loc.id} />
								<input type="hidden" name="eventId" value={event.id} />
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									class="size-7 text-muted-foreground hover:text-destructive shrink-0"
								>
									<TrashIcon class="size-3.5" />
								</Button>
							</form>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="space-y-8">
			{#if groupedSchedules.length === 0 && addingForDay === null}
				<p class="text-muted-foreground py-8 text-center">No schedule items yet.</p>
			{/if}

			{#each groupedSchedules as [dayKey, items] (dayKey)}
				<div class="space-y-3">
					<h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{formatDayHeading(dayKey)}
					</h2>

					<div class="space-y-2">
						{#each items as item (item.id)}
							{#if editingId === item.id}
								<!-- Inline edit form -->
								<form
									method="POST"
									action="?/updateSchedule"
									use:enhance={() => ({ update }) => {
										update();
										editingId = null;
									}}
									class="rounded-lg border bg-card p-4 space-y-3"
								>
									<input type="hidden" name="id" value={item.id} />
									<div class="grid grid-cols-2 gap-3">
										<div class="col-span-2">
											<label class="text-xs font-medium text-muted-foreground">Name *</label>
											<Input name="name" value={item.name} required class="mt-1" />
										</div>
										<div class="col-span-2">
											<label class="text-xs font-medium text-muted-foreground">Day *</label>
											<div class="mt-1 flex flex-wrap gap-1.5">
												{#each eventDays as day}
													<button
														type="button"
														class="rounded-md border px-3 py-1 text-sm transition-colors {editSelectedDay === day ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}"
														onclick={() => (editSelectedDay = day)}
													>{formatDayButton(day)}</button>
												{/each}
											</div>
										</div>
										<div>
											<label class="text-xs font-medium text-muted-foreground">Start time *</label>
											<Input type="time" bind:value={editStartTime} required class="mt-1" />
										</div>
										<div>
											<label class="text-xs font-medium text-muted-foreground">End time *</label>
											<Input type="time" bind:value={editEndTime} required class="mt-1" />
										</div>
										<input type="hidden" name="startDate" value={editSelectedDay && editStartTime ? `${editSelectedDay}T${editStartTime}` : ''} />
										<input type="hidden" name="endDate" value={editSelectedDay && editEndTime ? `${editSelectedDay}T${editEndTime}` : ''} />
										<div class="col-span-2">
											<label for="edit-location-select" class="text-xs font-medium text-muted-foreground">Location</label>
											<select
												id="edit-location-select"
												name="locationId"
												class="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
												value={editingLocationId}
											>
												<option value="">No location</option>
												{#each eventLocationsList ?? [] as loc (loc.id)}
													<option value={loc.id}>{loc.name}</option>
												{/each}
											</select>
										</div>
										<div class="col-span-2">
											<label class="text-xs font-medium text-muted-foreground">Description</label>
											<Textarea
												name="description"
												value={item.description ?? ''}
												placeholder="Optional"
												class="mt-1"
											/>
										</div>
									</div>
									<div class="flex gap-2 justify-end">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => (editingId = null)}
										>
											Cancel
										</Button>
										<Button type="submit" size="sm">Save</Button>
									</div>
								</form>
							{:else}
								<!-- Card view -->
								<div class="rounded-lg border bg-card p-4">
									<div class="flex items-start justify-between gap-4">
										<div class="min-w-0">
											<p class="font-semibold">{item.name}</p>
											{#if item.description}
												<p class="mt-1 text-sm text-muted-foreground">{item.description}</p>
											{/if}
											{#if item.locationId}
												{@const loc = (eventLocationsList ?? []).find((l) => l.id === item.locationId)}
												{#if loc}
													<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
														<MapPinIcon class="size-3.5 shrink-0" />
														{loc.name}
													</p>
												{/if}
											{/if}
										</div>
										<div class="flex items-center gap-3 shrink-0">
											<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
												<ClockIcon class="size-3.5" />
												{formatTime(item.startDate)} → {formatTime(item.endDate)}
											</p>
											<div class="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													class="size-7"
													onclick={() => (editingId = item.id)}
												>
													<PencilIcon class="size-3.5" />
												</Button>
												<form
													method="POST"
													action="?/deleteSchedule"
													use:enhance={({ cancel }) => {
														if (!confirm('Delete this schedule item?')) cancel();
													}}
												>
													<input type="hidden" name="id" value={item.id} />
													<Button
														type="submit"
														variant="ghost"
														size="icon"
														class="size-7 text-destructive hover:text-destructive"
													>
														<TrashIcon class="size-3.5" />
													</Button>
												</form>
											</div>
										</div>
									</div>
								</div>
							{/if}
						{/each}

						<!-- Add form for this day or add button -->
						{#if addingForDay === dayKey}
							<form
								method="POST"
								action="?/addSchedule"
								use:enhance={() => ({ update }) => {
									update();
									addingForDay = null;
								}}
								class="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3"
							>
								<div class="grid grid-cols-2 gap-3">
									<div class="col-span-2">
										<label class="text-xs font-medium text-muted-foreground">Name *</label>
										<Input name="name" required placeholder="Activity name" class="mt-1" />
									</div>
									<div class="col-span-2">
										<label class="text-xs font-medium text-muted-foreground">Day *</label>
										<div class="mt-1 flex flex-wrap gap-1.5">
											{#each eventDays as day}
												<button
													type="button"
													class="rounded-md border px-3 py-1 text-sm transition-colors {addSelectedDay === day ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}"
													onclick={() => (addSelectedDay = day)}
												>{formatDayButton(day)}</button>
											{/each}
										</div>
									</div>
									<div>
										<label class="text-xs font-medium text-muted-foreground">Start time *</label>
										<Input type="time" bind:value={addStartTime} required class="mt-1" />
									</div>
									<div>
										<label class="text-xs font-medium text-muted-foreground">End time *</label>
										<Input type="time" bind:value={addEndTime} required class="mt-1" />
									</div>
									<input type="hidden" name="startDate" value={addSelectedDay && addStartTime ? `${addSelectedDay}T${addStartTime}` : ''} />
									<input type="hidden" name="endDate" value={addSelectedDay && addEndTime ? `${addSelectedDay}T${addEndTime}` : ''} />
									<div class="col-span-2">
										<label for="add-day-location-select" class="text-xs font-medium text-muted-foreground">Location</label>
										<select
											id="add-day-location-select"
											name="locationId"
											class="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
											value={selectedLocationId}
											onchange={(e) =>
												(selectedLocationId = e.currentTarget.value
													? parseInt(e.currentTarget.value)
													: null)}
										>
											<option value="">No location</option>
											{#each eventLocationsList ?? [] as loc (loc.id)}
												<option value={loc.id}>{loc.name}</option>
											{/each}
										</select>
									</div>
									<div class="col-span-2">
										<label class="text-xs font-medium text-muted-foreground">Description</label>
										<Textarea name="description" placeholder="Optional" class="mt-1" />
									</div>
								</div>
								<div class="flex gap-2 justify-end">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => (addingForDay = null)}
									>
										Cancel
									</Button>
									<Button type="submit" size="sm">Add Item</Button>
								</div>
							</form>
						{:else}
							<Button
								variant="ghost"
								size="sm"
								class="w-full border border-dashed text-muted-foreground"
								onclick={() => (addingForDay = dayKey)}
							>
								<PlusIcon class="size-4" />
								Add item for {formatDayHeading(dayKey)}
							</Button>
						{/if}
					</div>
				</div>
			{/each}

			<!-- Add for new day (or first item) -->
			{#if addingForDay === 'new'}
				<form
					method="POST"
					action="?/addSchedule"
					use:enhance={() => ({ update }) => {
						update();
						addingForDay = null;
					}}
					class="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3"
				>
					<p class="text-sm font-medium">New Schedule Item</p>
					<div class="grid grid-cols-2 gap-3">
						<div class="col-span-2">
							<label class="text-xs font-medium text-muted-foreground">Name *</label>
							<Input name="name" required placeholder="Activity name" class="mt-1" />
						</div>
						<div class="col-span-2">
							<label class="text-xs font-medium text-muted-foreground">Day *</label>
							<div class="mt-1 flex flex-wrap gap-1.5">
								{#each eventDays as day}
									<button
										type="button"
										class="rounded-md border px-3 py-1 text-sm transition-colors {addSelectedDay === day ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-accent'}"
										onclick={() => (addSelectedDay = day)}
									>{formatDayButton(day)}</button>
								{/each}
							</div>
						</div>
						<div>
							<label class="text-xs font-medium text-muted-foreground">Start time *</label>
							<Input type="time" bind:value={addStartTime} required class="mt-1" />
						</div>
						<div>
							<label class="text-xs font-medium text-muted-foreground">End time *</label>
							<Input type="time" bind:value={addEndTime} required class="mt-1" />
						</div>
						<input type="hidden" name="startDate" value={addSelectedDay && addStartTime ? `${addSelectedDay}T${addStartTime}` : ''} />
						<input type="hidden" name="endDate" value={addSelectedDay && addEndTime ? `${addSelectedDay}T${addEndTime}` : ''} />
						<div class="col-span-2">
							<label for="add-new-location-select" class="text-xs font-medium text-muted-foreground">Location</label>
							<select
								id="add-new-location-select"
								name="locationId"
								class="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
								value={selectedLocationId}
								onchange={(e) =>
									(selectedLocationId = e.currentTarget.value
										? parseInt(e.currentTarget.value)
										: null)}
							>
								<option value="">No location</option>
								{#each eventLocationsList ?? [] as loc (loc.id)}
									<option value={loc.id}>{loc.name}</option>
								{/each}
							</select>
						</div>
						<div class="col-span-2">
							<label class="text-xs font-medium text-muted-foreground">Description</label>
							<Textarea name="description" placeholder="Optional" class="mt-1" />
						</div>
					</div>
					<div class="flex gap-2 justify-end">
						<Button type="button" variant="ghost" size="sm" onclick={() => (addingForDay = null)}>
							Cancel
						</Button>
						<Button type="submit" size="sm">Add Item</Button>
					</div>
				</form>
			{:else}
				<div class="space-y-3">
					<Button variant="outline" size="sm" onclick={() => (addingForDay = 'new')}>
						<PlusIcon class="size-4" />
						Add Schedule Item
					</Button>
				</div>
			{/if}
		</div>

	<!-- Invite tab -->
	{:else if activeTab === 'invite'}
		<div class="space-y-6 max-w-lg">
			<div>
				<h2 class="text-lg font-semibold">Invite Organizers</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Share a magic link to invite co-organizers. Anyone with the link can join as an organizer.
				</p>
			</div>

			{#if !magicLink}
				<form method="POST" action="?/generateLink" use:enhance>
					<Button type="submit">
						<LinkIcon class="size-4" />
						Generate Invite Link
					</Button>
				</form>
			{:else}
				<div class="space-y-3">
					<div class="flex gap-2">
						<Input value={magicLinkUrl ?? ''} readonly class="font-mono text-xs" />
						<Button variant="outline" size="icon" onclick={copyLink} title="Copy link">
							<CopyIcon class="size-4" />
						</Button>
					</div>
					<div class="flex items-center justify-between">
						{#if magicLinkExpired}
							<p class="text-sm text-destructive">Link expired</p>
						{:else}
							<p class="text-sm text-muted-foreground">
								Expires in {hoursUntilExpiry(magicLink.expiresAt)} hours
							</p>
						{/if}
						<form method="POST" action="?/regenerateLink" use:enhance>
							<Button type="submit" variant="outline" size="sm">Regenerate</Button>
						</form>
					</div>
				</div>
			{/if}

			{#if organizers.length > 0}
				<div>
					<h3 class="text-sm font-semibold mb-3">Co-organizers</h3>
					<div class="rounded-lg border overflow-hidden">
						<table class="w-full text-sm">
							<thead class="bg-muted/50">
								<tr>
									<th class="px-4 py-2 text-left font-medium">Name</th>
									<th class="px-4 py-2 text-left font-medium">Email</th>
								</tr>
							</thead>
							<tbody>
								{#each organizers as org (org.id)}
									<tr class="border-t">
										<td class="px-4 py-2">{org.name}</td>
										<td class="px-4 py-2 text-muted-foreground">{org.email}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Danger Zone -->
	<div class="mt-16 border border-destructive/30 rounded-lg p-6">
		<h2 class="text-base font-semibold text-destructive mb-1">Danger Zone</h2>
		<p class="text-sm text-muted-foreground mb-4">
			Permanently delete this event and all its data. This cannot be undone.
		</p>
		<form
			method="POST"
			action="?/deleteEvent"
			use:enhance={({ cancel }) => {
				if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) cancel();
			}}
		>
			<Button type="submit" variant="destructive" size="sm">
				<TrashIcon class="size-4" />
				Delete Event
			</Button>
		</form>
	</div>

	<!-- Venue Location Picker Dialog -->
	<Dialog.Root bind:open={showVenuePicker}>
		<Dialog.Content class="max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>Add New Location</Dialog.Title>
				<Dialog.Description>Search for a venue, then drag the pin to fine-tune.</Dialog.Description>
			</Dialog.Header>
			<form
				{...createEventLocation}
				onsubmit={() => (showVenuePicker = false)}
				class="space-y-4"
			>
				<input type="hidden" name="eventId" value={event.id} />
				<VenueLocationPicker lat={eventLat} lng={eventLng} />
				<Dialog.Footer>
					<Button variant="outline" type="button" onclick={() => (showVenuePicker = false)}>Cancel</Button>
					<Button type="submit">Save Location</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
