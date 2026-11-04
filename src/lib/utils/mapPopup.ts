import { resolve } from '$app/paths';
import { escapeHtml } from '#lib/utils/html';
import { formatShortDateRange } from '#lib/utils/dates';

/** Crew markers use the same escaping boundary as event popups. */
export function buildCrewPopupHtml(crew: {
	id: string;
	name: string;
	city: string;
	country: string;
}): string {
	return `<div style="min-width:180px;font-size:0.85rem;line-height:1.4">
		<p style="font-weight:600;margin:0 0 2px">${escapeHtml(crew.name)}</p>
		<p>${escapeHtml(crew.city)}, ${escapeHtml(crew.country)}</p>
		<a href="${escapeHtml(resolve('/crews/[id]', { id: crew.id }))}">View crew →</a>
	</div>`;
}

type PopupEvent = {
	id: string;
	name: string;
	startDate: Date;
	endDate: Date;
	location: string | null;
};

/** Leaflet accepts HTML strings; every dynamic value must be HTML-escaped. */
export function buildPopupHtml(group: PopupEvent[]): string {
	const muted = 'color:var(--muted-foreground);font-size:0.8rem;margin:0 0 4px';
	const entries = group.map((ev, i) => {
		const border =
			i > 0 ? 'border-top:1px solid var(--border);padding-top:8px;margin-top:8px;' : '';
		return `
			<div style="${border}">
				<p style="font-weight:600;margin:0 0 2px">${escapeHtml(ev.name)}</p>
				<p style="${muted}">${escapeHtml(formatShortDateRange(ev.startDate, ev.endDate))}</p>
				${ev.location ? `<p style="${muted}">${escapeHtml(ev.location)}</p>` : ''}
				<a href="${escapeHtml(resolve('/events/[id]', { id: ev.id }))}" style="color:var(--primary);font-size:0.8rem;text-decoration:none;">View event →</a>
			</div>`;
	});
	return `<div style="min-width:180px;font-size:0.85rem;line-height:1.4">${entries.join('')}</div>`;
}
