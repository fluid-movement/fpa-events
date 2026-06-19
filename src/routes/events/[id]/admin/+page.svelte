<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LinkIcon from '@lucide/svelte/icons/link';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const attendees = $derived(data.attendees);
	const schedules = $derived(data.schedules);
	const magicLink = $derived(data.magicLink);
	const origin = $derived(data.origin);

	let activeTab = $state<'attending' | 'schedule' | 'invite'>('attending');
	let editingId = $state<string | null>(null);
	let addingForDay = $state<string | null>(null);

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

	function toDatetimeLocal(d: Date) {
		const date = new Date(d);
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	const groupedSchedules = $derived.by(() => {
		const sorted = [...schedules].sort(
			(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		);
		const groups = new Map<string, typeof schedules>();
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
										<div>
											<label class="text-xs font-medium text-muted-foreground">Start *</label>
											<Input
												type="datetime-local"
												name="startDate"
												value={toDatetimeLocal(item.startDate)}
												required
												class="mt-1"
											/>
										</div>
										<div>
											<label class="text-xs font-medium text-muted-foreground">End *</label>
											<Input
												type="datetime-local"
												name="endDate"
												value={toDatetimeLocal(item.endDate)}
												required
												class="mt-1"
											/>
										</div>
										<div class="col-span-2">
											<label class="text-xs font-medium text-muted-foreground">Location</label>
											<Input
												name="location"
												value={item.location ?? ''}
												placeholder="Optional"
												class="mt-1"
											/>
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
											{#if item.location}
												<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
													<MapPinIcon class="size-3.5 shrink-0" />
													{item.location}
												</p>
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
									<div>
										<label class="text-xs font-medium text-muted-foreground">Start *</label>
										<Input type="datetime-local" name="startDate" required class="mt-1" />
									</div>
									<div>
										<label class="text-xs font-medium text-muted-foreground">End *</label>
										<Input type="datetime-local" name="endDate" required class="mt-1" />
									</div>
									<div class="col-span-2">
										<label class="text-xs font-medium text-muted-foreground">Location</label>
										<Input name="location" placeholder="Optional" class="mt-1" />
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
						<div>
							<label class="text-xs font-medium text-muted-foreground">Start *</label>
							<Input type="datetime-local" name="startDate" required class="mt-1" />
						</div>
						<div>
							<label class="text-xs font-medium text-muted-foreground">End *</label>
							<Input type="datetime-local" name="endDate" required class="mt-1" />
						</div>
						<div class="col-span-2">
							<label class="text-xs font-medium text-muted-foreground">Location</label>
							<Input name="location" placeholder="Optional" class="mt-1" />
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
				<Button variant="outline" size="sm" onclick={() => (addingForDay = 'new')}>
					<PlusIcon class="size-4" />
					Add Schedule Item
				</Button>
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
</div>
