import type { Component } from 'svelte';
import type { Pathname } from '$app/types';
import { page } from '$app/state';
import { House, Calendar, CircleUserRound, Heart, ClipboardList, Settings, Podium } from '@lucide/svelte/icons';

export type MenuGroup = {
	label?: string;
	items: MenuItem[];
};

export type MenuItem = {
	label: string;
	url: Pathname;
	icon: Component;
};

export const menuGroups: MenuGroup[] = [
	{
		items: [
			{
				label: 'Home',
				url: '/',
				icon: House
			},
			{
				label: 'Event Calendar',
				url: '/events',
				icon: Calendar
			},
			{
				label: 'Rankings',
				url: '/rankings',
				icon: Podium
			}
		]
	},
	{
		label: 'User',
		items: [
			{
				label: 'My Dashboard',
				url: '/dashboard',
				icon: CircleUserRound
			},
			{
				label: 'Attending',
				url: '/attending',
				icon: Heart
			},
			{
				label: 'Organizing',
				url: '/organizing',
				icon: ClipboardList
			},
			{
				label: 'Settings',
				url: '/settings/profile',
				icon: Settings
			}
		]
	}
];

export const routeActive = (url: Pathname, pathname = page.url.pathname): boolean => {
	if (url === '/') {
		return pathname === '/';
	}

	return pathname.startsWith(url);
};
