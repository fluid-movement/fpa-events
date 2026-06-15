<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	// Button
	import { Button } from '$lib/components/ui/button';

	// Form elements
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import {
		Field,
		FieldLabel,
		FieldDescription,
		FieldError,
		FieldContent
	} from '$lib/components/ui/field';

	// Card
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter,
		CardAction
	} from '$lib/components/ui/card';

	// Sheet
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet';

	// Tooltip
	import {
		Tooltip,
		TooltipTrigger,
		TooltipContent,
		TooltipProvider
	} from '$lib/components/ui/tooltip';

	// Separator
	import { Separator } from '$lib/components/ui/separator';

	// Skeleton
	import { Skeleton } from '$lib/components/ui/skeleton';

	// Range Calendar
	import { RangeCalendar } from '$lib/components/ui/range-calendar';

	// Event Calendar Card
	import EventCalendarCard from '$lib/components/EventCalendarCard.svelte';

	// Range calendar state
	let dateRange = $state<{ start: unknown; end: unknown } | undefined>(undefined);

	// Sample event for EventCalendarCard
	const sampleEvent = {
		id: 'demo-event-1',
		userId: 'demo-user',
		name: 'FPA World Cup 2026',
		startDate: new Date('2026-08-14'),
		endDate: new Date('2026-08-17'),
		location: 'Geneva, Switzerland',
		description: 'The premier freestyle footbag competition of the year.',
		picture: null,
		pictureWidth: null,
		pictureHeight: null,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const colorSwatches = [
		{ name: 'background', style: 'background: var(--background)', border: true },
		{ name: 'card', style: 'background: var(--card)', border: true },
		{ name: 'popover', style: 'background: var(--popover)', border: true },
		{ name: 'primary', style: 'background: var(--primary)', border: false },
		{ name: 'secondary', style: 'background: var(--secondary)', border: false },
		{ name: 'muted', style: 'background: var(--muted)', border: false },
		{ name: 'accent', style: 'background: var(--accent)', border: false },
		{ name: 'destructive', style: 'background: var(--destructive)', border: false },
		{ name: 'border', style: 'background: var(--border)', border: false },
		{ name: 'input', style: 'background: var(--input)', border: false },
		{ name: 'ring', style: 'background: var(--ring)', border: false },
		{ name: 'sidebar', style: 'background: var(--sidebar)', border: true }
	];
</script>

<div class="max-w-4xl mx-auto px-6 py-12 space-y-16">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Design System Reference</h1>
		<p class="text-muted-foreground">
			Dev-only component showcase. Not linked from the nav.
		</p>
	</div>

	<!-- 1. Typography -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">1. Typography</h2>
		<div class="space-y-3">
			<h1>Heading 1 — The quick brown fox</h1>
			<h2>Heading 2 — The quick brown fox</h2>
			<h3>Heading 3 — The quick brown fox</h3>
			<p>
				Body text — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
				tempor incididunt ut labore et dolore magna aliqua.
			</p>
			<p class="text-muted-foreground">
				Muted text — This text uses <code>text-muted-foreground</code> and is used for
				secondary information.
			</p>
			<p class="text-sm text-muted-foreground">
				Small / caption text — Used for timestamps, labels, and fine print.
			</p>
		</div>
	</section>

	<!-- 2. Color Palette -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">2. Color Palette</h2>
		<div class="flex flex-wrap gap-4">
			{#each colorSwatches as swatch (swatch.name)}
				<div class="flex flex-col items-center gap-2">
					<div
						style="width:7rem;height:5rem;border-radius:0.75rem;{swatch.border ? 'border:1px solid var(--border);' : ''}{swatch.style}"
					></div>
					<span class="text-xs text-muted-foreground font-mono">{swatch.name}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- 3. Buttons -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b pb-2">3. Buttons</h2>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Variants</h3>
			<div class="flex flex-wrap gap-3 items-center">
				<Button variant="default">Default</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="link">Link</Button>
			</div>
		</div>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sizes</h3>
			<div class="flex flex-wrap gap-3 items-center">
				<Button size="sm">Small</Button>
				<Button size="default">Default</Button>
				<Button size="lg">Large</Button>
				<Button size="icon"><PlusIcon class="size-4" /></Button>
			</div>
		</div>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Disabled</h3>
			<div class="flex flex-wrap gap-3 items-center">
				<Button variant="default" disabled>Default</Button>
				<Button variant="destructive" disabled>Destructive</Button>
				<Button variant="outline" disabled>Outline</Button>
				<Button variant="secondary" disabled>Secondary</Button>
				<Button variant="ghost" disabled>Ghost</Button>
				<Button variant="link" disabled>Link</Button>
			</div>
		</div>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">With Icon</h3>
			<div class="flex flex-wrap gap-3 items-center">
				<Button>
					<PlusIcon class="size-4" />
					Create Event
				</Button>
			</div>
		</div>
	</section>

	<!-- 4. Form Elements -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b pb-2">4. Form Elements</h2>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
			<!-- Label + Input normal -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Label + Input</h3>
				<Label for="demo-input">Event name</Label>
				<Input id="demo-input" placeholder="e.g. FPA World Cup" />
			</div>

			<!-- Label + Input disabled -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Input Disabled</h3>
				<Label for="demo-input-disabled">Event name</Label>
				<Input id="demo-input-disabled" placeholder="Can't edit this" disabled />
			</div>

			<!-- Field with description -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Field with Description</h3>
				<Field>
					<FieldLabel>Location</FieldLabel>
					<FieldDescription>City and country of the event venue.</FieldDescription>
					<FieldContent>
						<Input placeholder="e.g. Geneva, Switzerland" />
					</FieldContent>
				</Field>
			</div>

			<!-- Field with error -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Field with Error</h3>
				<Field data-invalid="true">
					<FieldLabel>Start date</FieldLabel>
					<FieldContent>
						<Input placeholder="YYYY-MM-DD" value="not-a-date" />
					</FieldContent>
					<FieldError errors={[{ message: 'Please enter a valid date.' }]} />
				</Field>
			</div>

			<!-- Textarea normal -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Textarea</h3>
				<Label for="demo-textarea">Description</Label>
				<Textarea id="demo-textarea" placeholder="Describe your event..." rows={3} />
			</div>

			<!-- Textarea disabled -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Textarea Disabled</h3>
				<Label for="demo-textarea-disabled">Description</Label>
				<Textarea id="demo-textarea-disabled" placeholder="Can't edit this" rows={3} disabled />
			</div>
		</div>
	</section>

	<!-- 5. Cards -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">5. Cards</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<!-- Basic card -->
			<Card>
				<CardHeader>
					<CardTitle>FPA World Cup 2026</CardTitle>
					<CardDescription>Geneva, Switzerland · Aug 14–17</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-muted-foreground">
						The premier freestyle footbag competition featuring top players from around the globe.
					</p>
				</CardContent>
				<CardFooter>
					<Button size="sm">View details</Button>
				</CardFooter>
			</Card>

			<!-- Card with action in header -->
			<Card>
				<CardHeader>
					<CardTitle>Upcoming Events</CardTitle>
					<CardDescription>Your registered competitions</CardDescription>
					<CardAction>
						<Button variant="outline" size="sm">
							<PlusIcon class="size-4" />
							Add
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent>
					<p class="text-sm text-muted-foreground">
						No upcoming events yet. Register for a competition to see it here.
					</p>
				</CardContent>
			</Card>
		</div>
	</section>

	<!-- 6. Sheet (Drawer) -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">6. Sheet (Drawer)</h2>
		<Sheet>
			<SheetTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline">Open right sheet</Button>
				{/snippet}
			</SheetTrigger>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Event Details</SheetTitle>
					<SheetDescription>
						Review and edit the details for this event before publishing.
					</SheetDescription>
				</SheetHeader>
				<div class="px-4 space-y-4">
					<div class="space-y-2">
						<Label for="sheet-name">Event name</Label>
						<Input id="sheet-name" placeholder="e.g. FPA World Cup" />
					</div>
					<div class="space-y-2">
						<Label for="sheet-location">Location</Label>
						<Input id="sheet-location" placeholder="e.g. Geneva, Switzerland" />
					</div>
					<Button class="w-full">Save changes</Button>
				</div>
			</SheetContent>
		</Sheet>
	</section>

	<!-- 7. Tooltip -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">7. Tooltip</h2>
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon">
							<PlusIcon class="size-4" />
							<span class="sr-only">Add event</span>
						</Button>
					{/snippet}
				</TooltipTrigger>
				<TooltipContent>
					<p>Add a new event</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	</section>

	<!-- 8. Separator -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">8. Separator</h2>
		<div class="space-y-4">
			<div>
				<p class="text-sm text-muted-foreground mb-2">Horizontal</p>
				<Separator />
			</div>
			<div>
				<p class="text-sm text-muted-foreground mb-2">Vertical (in flex row)</p>
				<div class="flex items-center h-5 gap-4">
					<span class="text-sm">Events</span>
					<Separator orientation="vertical" />
					<span class="text-sm">Athletes</span>
					<Separator orientation="vertical" />
					<span class="text-sm">Results</span>
				</div>
			</div>
		</div>
	</section>

	<!-- 9. Skeleton -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">9. Skeleton</h2>
		<div class="flex gap-4">
			<!-- Card skeleton -->
			<div class="w-64 space-y-3">
				<Skeleton class="h-32 w-full rounded-lg" />
				<Skeleton class="h-4 w-3/4" />
				<Skeleton class="h-4 w-1/2" />
			</div>
			<!-- List skeleton -->
			<div class="flex-1 space-y-3">
				{#each [1, 2, 3] as _, i (i)}
					<div class="flex items-center gap-3">
						<Skeleton class="size-10 rounded-full shrink-0" />
						<div class="flex-1 space-y-1.5">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-3 w-2/3" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- 10. Range Calendar -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">10. Range Calendar</h2>
		<RangeCalendar bind:value={dateRange} numberOfMonths={2} />
		{#if dateRange?.start && dateRange?.end}
			<p class="text-sm text-muted-foreground">
				Selected: {String(dateRange.start)} — {String(dateRange.end)}
			</p>
		{/if}
	</section>

	<!-- 11. Event Calendar Card -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold border-b pb-2">11. Event Calendar Card</h2>
		<div class="max-w-md">
			<EventCalendarCard event={sampleEvent} />
		</div>
	</section>

	<!-- 12. Navigation -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b pb-2">12. Navigation</h2>
		<p class="text-sm text-muted-foreground">The live sidebar is visible on the left. Below are isolated states of individual nav components.</p>

		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar menu item — default</p>
			<div class="w-64 rounded-lg bg-sidebar p-2">
				<div class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
					<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
					<span>Home</span>
				</div>
			</div>
		</div>

		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar menu item — active</p>
			<div class="w-64 rounded-lg bg-sidebar p-2">
				<div
					class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors cursor-pointer"
					style="background: linear-gradient(to right, color-mix(in oklch, var(--sidebar-primary) 18%, transparent), transparent)"
				>
					<svg class="size-4 shrink-0 text-sidebar-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
					<span>Event Calendar</span>
				</div>
			</div>
		</div>

		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar footer — logged in</p>
			<div class="w-64 rounded-lg bg-sidebar p-2 space-y-1">
				<div class="flex items-center gap-3 px-3 py-2">
					<div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">AZ</div>
					<div class="flex flex-col min-w-0">
						<span class="text-sm font-medium truncate">Andre Zaharias</span>
						<span class="text-xs text-muted-foreground truncate">andre@example.com</span>
					</div>
				</div>
				<button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
					<svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
					Sign Out
				</button>
			</div>
		</div>

		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar footer — logged out</p>
			<div class="w-64 rounded-lg bg-sidebar p-2 space-y-1">
				<button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors">
					<svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
					Sign In
				</button>
				<button class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors">
					<svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					Create Account
				</button>
			</div>
		</div>

		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mobile top bar</p>
			<div class="w-full max-w-sm rounded-lg bg-card border border-border overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3">
					<button class="size-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
						<svg class="size-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
					</button>
					<img src="/fpa-logo-light.png" alt="FPA Logo" class="h-6 w-auto" />
					<div class="size-8"></div>
				</div>
			</div>
		</div>
	</section>
</div>
