import type { Component } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
// Deep imports, not the `@lucide/svelte/icons` barrel: the barrel drags all
// ~1200 icon modules into the SSR graph, which times out Vite's module runner
// on a cold cache. Every other file in the app imports icons this way too.
import House from '@lucide/svelte/icons/house';
import Calendar from '@lucide/svelte/icons/calendar';
import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
import Heart from '@lucide/svelte/icons/heart';
import ClipboardList from '@lucide/svelte/icons/clipboard-list';
import Settings from '@lucide/svelte/icons/settings';
import Podium from '@lucide/svelte/icons/podium';
import Trophy from '@lucide/svelte/icons/trophy';

export type MenuGroup = {
	label?: string;
	items: MenuItem[];
};

export type MenuItem = {
	label: string;
	/**
	 * Resolved at the definition site below rather than at render time: `resolve`
	 * is overloaded per route, and passing the whole `Pathname` union through it
	 * from inside a loop no longer typechecks as the route table grows.
	 */
	url: ResolvedPathname;
	icon: Component;
};

export const menuGroups: MenuGroup[] = [
	{
		items: [
			{
				label: 'Home',
				url: resolve('/'),
				icon: House
			},
			{
				label: 'Event Calendar',
				url: resolve('/events'),
				icon: Calendar
			},
			{
				label: 'Rankings',
				url: resolve('/rankings'),
				icon: Podium
			},
			{
				label: 'Results',
				url: resolve('/results'),
				icon: Trophy
			}
		]
	},
	{
		label: 'User',
		items: [
			{
				label: 'My Dashboard',
				url: resolve('/dashboard'),
				icon: CircleUserRound
			},
			{
				label: 'Attending',
				url: resolve('/attending'),
				icon: Heart
			},
			{
				label: 'Organizing',
				url: resolve('/organizing'),
				icon: ClipboardList
			},
			{
				label: 'Settings',
				url: resolve('/settings/profile'),
				icon: Settings
			}
		]
	}
];

export const routeActive = (url: ResolvedPathname, pathname = page.url.pathname): boolean => {
	if (url === '/') {
		return pathname === '/';
	}

	return pathname.startsWith(url);
};
