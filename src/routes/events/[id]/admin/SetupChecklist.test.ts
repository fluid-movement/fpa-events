import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SetupChecklist from './SetupChecklist.svelte';
import type { ChecklistItem } from './SetupChecklist.svelte';

const incompleteItems: ChecklistItem[] = [
	{ label: 'Event details', done: true },
	{ label: 'Add a cover image', done: false, href: '/events/evt-001/admin/edit' },
	{ label: 'Add a schedule', done: false, href: '/events/evt-001/admin/schedule' }
];

function renderChecklist(overrides: Partial<Parameters<typeof render>[1]> = {}) {
	return render(SetupChecklist, {
		props: {
			eventId: 'evt-001',
			eventName: 'FPA World Cup 2026',
			items: incompleteItems,
			publicUrl: 'https://example.test/events/evt-001',
			...overrides
		}
	});
}

describe('SetupChecklist', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders when there are incomplete items', async () => {
		renderChecklist();
		expect(await screen.findByTestId('setup-checklist')).toBeInTheDocument();
		expect(screen.getByText(/Finish setting up FPA World Cup 2026/)).toBeInTheDocument();
	});

	it('counts only the remaining steps', async () => {
		renderChecklist();
		await screen.findByTestId('setup-checklist');
		expect(screen.getByText(/2 steps left/)).toBeInTheDocument();
	});

	it('uses the singular when one step is left', async () => {
		renderChecklist({
			items: [
				{ label: 'Event details', done: true },
				{ label: 'Add a schedule', done: false, href: '/events/evt-001/admin/schedule' }
			]
		});
		await screen.findByTestId('setup-checklist');
		expect(screen.getByText(/1 step left/)).toBeInTheDocument();
	});

	it('hides itself once every item is done', () => {
		renderChecklist({
			items: [
				{ label: 'Event details', done: true },
				{ label: 'Add a schedule', done: true, href: '/events/evt-001/admin/schedule' }
			]
		});
		expect(screen.queryByTestId('setup-checklist')).not.toBeInTheDocument();
	});

	it('hides itself for past events', () => {
		renderChecklist({ isPast: true });
		expect(screen.queryByTestId('setup-checklist')).not.toBeInTheDocument();
	});

	it('stays hidden when previously dismissed for this event', () => {
		localStorage.setItem('event-setup-dismissed:evt-001', '1');
		renderChecklist();
		expect(screen.queryByTestId('setup-checklist')).not.toBeInTheDocument();
	});

	it('a dismissal for another event does not hide this one', async () => {
		localStorage.setItem('event-setup-dismissed:some-other-event', '1');
		renderChecklist();
		expect(await screen.findByTestId('setup-checklist')).toBeInTheDocument();
	});

	it('links an incomplete item to its destination', async () => {
		renderChecklist();
		await screen.findByTestId('setup-checklist');
		expect(screen.getByRole('link', { name: 'Add a schedule' })).toHaveAttribute(
			'href',
			'/events/evt-001/admin/schedule'
		);
	});

	it('renders completed items as plain text, not links', async () => {
		renderChecklist();
		await screen.findByTestId('setup-checklist');
		expect(screen.queryByRole('link', { name: 'Event details' })).not.toBeInTheDocument();
		expect(screen.getByText('Event details')).toBeInTheDocument();
	});
});
