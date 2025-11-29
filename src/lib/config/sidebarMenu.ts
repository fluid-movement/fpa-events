import type { Component } from 'svelte';
import type { Pathname } from '$app/types';
import { page } from '$app/state';
import HouseIcon from '@lucide/svelte/icons/house';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import CircleUserRoundIcon from '@lucide/svelte/icons/circle-user-round';
import HeartIcon from '@lucide/svelte/icons/heart';

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
				icon: HouseIcon
			},
			{
				label: 'Events',
				url: '/events',
				icon: CalendarIcon
			}
		]
	},
	{
		label: 'User',
		items: [
			{
				label: 'My Dashboard',
				url: '/dashboard',
				icon: CircleUserRoundIcon
			},
			{
				label: 'Attending',
				url: '/attending',
				icon: HeartIcon
			}
		]
	}
];

export const routeActive = (url: Pathname): boolean => {
	if (url === '/') {
		return page.url.pathname === '/';
	}

	return page.url.pathname.startsWith(url);
};
