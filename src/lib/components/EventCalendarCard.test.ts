import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import EventCalendarCard from './EventCalendarCard.svelte';

const baseEvent = {
	id: 'evt-001',
	userId: 'user-1',
	name: 'FPA World Cup 2026',
	location: 'Geneva, Switzerland',
	city: 'Geneva',
	country: 'Switzerland',
	latitude: null,
	longitude: null,
	startDate: new Date('2026-08-14'),
	endDate: new Date('2026-08-17'),
	description: '',
	picture: null,
	pictureWidth: null,
	pictureHeight: null,
	createdAt: new Date(),
	updatedAt: new Date()
};

describe('EventCalendarCard', () => {
	it('renders the event name', () => {
		render(EventCalendarCard, { props: { event: baseEvent } });
		expect(screen.getByText('FPA World Cup 2026')).toBeInTheDocument();
	});

	it('renders the location', () => {
		render(EventCalendarCard, { props: { event: baseEvent } });
		expect(screen.getByText('Geneva, Switzerland')).toBeInTheDocument();
	});

	it('renders the start day and month in the chip', () => {
		render(EventCalendarCard, { props: { event: baseEvent } });
		expect(screen.getByText('14')).toBeInTheDocument();
		expect(screen.getByText('Aug')).toBeInTheDocument();
	});

	it('renders a same-month date range', () => {
		render(EventCalendarCard, { props: { event: baseEvent } });
		expect(screen.getByText('Aug 14 – 17')).toBeInTheDocument();
	});

	it('renders a single-day event date', () => {
		const singleDay = { ...baseEvent, startDate: new Date('2026-08-14'), endDate: new Date('2026-08-14') };
		render(EventCalendarCard, { props: { event: singleDay } });
		expect(screen.getByText('Aug 14')).toBeInTheDocument();
	});

	it('links to the event detail page', () => {
		render(EventCalendarCard, { props: { event: baseEvent } });
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/events/evt-001');
	});
});
