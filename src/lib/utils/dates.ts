export function toISODate(d: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(d: Date): string {
	return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function hoursUntil(d: Date): number {
	return Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60));
}

export function daysUntil(date: Date | string): number {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = new Date(date);
	const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
	return Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function countdownLabel(days: number): string {
	if (days === 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days < 0) return `${Math.abs(days)} days ago`;
	return `${days} days away`;
}

export function formatDateRange(start: Date, end: Date, locale = 'en-US'): string {
	const sameDay = start.toDateString() === end.toDateString();
	if (sameDay) {
		return start.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
	}
	if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
		return `${start.getDate()} - ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`;
	}
	const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
	const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
	return `${startStr} - ${endStr}`;
}
