<script lang="ts">
	import HouseIcon from '@lucide/svelte/icons/house';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { resolve } from '$app/paths';
	import type { ValidRoute } from '$lib/utils';
	import DarkLightToggle from './DarkLightToggle.svelte';
	import Logo from './Logo.svelte';

	type MenuGroup = {
		label?: string;
		items: MenuItem[];
	};

	type MenuItem = {
		label: string;
		url: ValidRoute;
		icon: typeof HouseIcon;
	};

	const menuGroups: MenuGroup[] = [
		{
			items: [
				{
					label: 'Home',
					url: '/',
					icon: HouseIcon
				},
				{
					label: 'Events',
					url: '/events',
					icon: InboxIcon
				}
			]
		},
		{
			label: 'User',
			items: [
				{
					label: 'My Dashboard',
					url: '/user',
					icon: HouseIcon
				},
				{
					label: 'Attending',
					url: '/user/attending',
					icon: HouseIcon
				}
			]
		}
	];
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
								<Sidebar.MenuButton>
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
		<DarkLightToggle />
	</Sidebar.Footer>
</Sidebar.Root>
