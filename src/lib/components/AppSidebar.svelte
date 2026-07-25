<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ResolvedPathname } from '$app/types';
	import { menuGroups, routeActive } from '$lib/config/sidebarMenu';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import Logo from './Logo.svelte';
	import SidebarLogin from './SidebarLogin.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from './ui/button';

	const isActive = (url: ResolvedPathname) => routeActive(url, page.url.pathname);
	const sidebar = useSidebar();
</script>

<Sidebar.Root>
	<Sidebar.Content>
		<Sidebar.Header>
			<a href={resolve('/')} onclick={() => sidebar.setOpenMobile(false)}>
				<Logo />
			</a>
		</Sidebar.Header>
		<Sidebar.Group>
			{#each menuGroups as group, i (i)}
				<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each group.items as item (item.label)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.url)}>
									{#snippet child({ props })}
										<a
											href={item.url}
											{...props}
											onclick={() => sidebar.setOpenMobile(false)}
										>
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
		<Button href={resolve('/events/create')} onclick={() => sidebar.setOpenMobile(false)}
			><PlusIcon /> Create Event</Button
		>
		<SidebarLogin onNavigate={() => sidebar.setOpenMobile(false)} />
		<div class="flex gap-3 px-1 pb-1">
			<a
				href={resolve('/privacy-policy')}
				class="text-xs text-muted-foreground hover:text-foreground"
				onclick={() => sidebar.setOpenMobile(false)}>Privacy</a
			>
			<a
				href={resolve('/legal-notice')}
				class="text-xs text-muted-foreground hover:text-foreground"
				onclick={() => sidebar.setOpenMobile(false)}>Legal Notice</a
			>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>
