<script lang="ts">
	import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = RangeCalendarPrimitive.RootProps & {
		class?: string;
	};

	let { class: className, value = $bindable(), ...restProps }: Props = $props();
</script>

<RangeCalendarPrimitive.Root
	bind:value
	class={cn('p-3', className)}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<div class="flex flex-col gap-4 sm:flex-row">
			{#each months as month (month.value.toString())}
				<div class="space-y-4">
					<RangeCalendarPrimitive.Header class="flex items-center justify-between px-1">
						<RangeCalendarPrimitive.PrevButton
							class="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
						>
							&#8249;
						</RangeCalendarPrimitive.PrevButton>
						<RangeCalendarPrimitive.Heading class="text-sm font-medium" />
						<RangeCalendarPrimitive.NextButton
							class="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
						>
							&#8250;
						</RangeCalendarPrimitive.NextButton>
					</RangeCalendarPrimitive.Header>

					<RangeCalendarPrimitive.Grid class="w-full border-collapse">
						<RangeCalendarPrimitive.GridHead>
							<RangeCalendarPrimitive.GridRow class="flex">
								{#each weekdays as weekday (weekday)}
									<RangeCalendarPrimitive.HeadCell
										class="w-9 text-center text-[0.8rem] font-normal text-muted-foreground"
									>
										{weekday.slice(0, 2)}
									</RangeCalendarPrimitive.HeadCell>
								{/each}
							</RangeCalendarPrimitive.GridRow>
						</RangeCalendarPrimitive.GridHead>
						<RangeCalendarPrimitive.GridBody>
							{#each month.weeks as weekDates, i (i)}
								<RangeCalendarPrimitive.GridRow class="mt-2 flex w-full">
									{#each weekDates as date (date.toString())}
										<RangeCalendarPrimitive.Cell {date} month={month.value} class="relative p-0">
											<RangeCalendarPrimitive.Day
												class="day-btn inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-disabled:pointer-events-none data-disabled:opacity-50 data-today:font-semibold data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary data-outside-month:text-muted-foreground data-outside-month:opacity-50"
											/>
										</RangeCalendarPrimitive.Cell>
									{/each}
								</RangeCalendarPrimitive.GridRow>
							{/each}
						</RangeCalendarPrimitive.GridBody>
					</RangeCalendarPrimitive.Grid>
				</div>
			{/each}
		</div>
	{/snippet}
</RangeCalendarPrimitive.Root>
