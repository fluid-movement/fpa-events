import type { Component } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { House, Calendar, CircleUserRound, Heart, ClipboardList, Settings, Podium } from '@lucide/svelte/icons';

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
