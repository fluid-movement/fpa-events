<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { resolve } from '$app/paths';
	import { menuGroups, routeActive } from '$lib/config/sidebarMenu';
	import DarkLightToggle from './DarkLightToggle.svelte';
	import Logo from './Logo.svelte';
	import SidebarLogin from './SidebarLogin.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from './ui/button';
</script>

<Sidebar.Root>
	<Sidebar.Content>
		<Sidebar.Header>
			<Logo />
		</Sidebar.Header>
		<Sidebar.Group>
			{#each menuGroups as group (group.label)}
				<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each group.items as item (item.label)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={routeActive(item.url)}>
									{#snippet child({ props })}
										<a href={resolve(item.url)} {...props}>
											<item.icon />
											<span>{item.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			{/each}
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Button href={resolve('/events/create')}><PlusIcon /> Create Event</Button>
		<SidebarLogin />
		<DarkLightToggle />
	</Sidebar.Footer>
</Sidebar.Root>
