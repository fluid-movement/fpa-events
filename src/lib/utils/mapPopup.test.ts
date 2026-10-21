import { describe, expect, it } from 'vitest';
import { buildPopupHtml } from './mapPopup';

const event = {
	id: '01M5A4X9AP5EG81X6ZCN9Q4JPJ',
	name: 'Freestyle',
	location: 'Berlin',
	startDate: new Date('2026-10-21T12:00:00Z'),
	endDate: new Date('2026-10-22T12:00:00Z')
};

function parse(html: string) {
	const container = document.createElement('div');
	container.innerHTML = html;
	return container;
}

describe('map popup HTML security', () => {
	it('keeps hostile names and locations as literal text', () => {
		const name = `"><img src=x onerror="alert(1)"> & 'name'`;
		const location = `<svg onload='alert(2)'> " & location`;
		const html = buildPopupHtml([{ ...event, name, location }]);
		const popup = parse(html);
		expect(popup.querySelector('p')?.textContent).toBe(name);
		expect(popup.querySelectorAll('p')[2].textContent).toBe(location);
		expect(popup.querySelector('img, svg, script, [onerror], [onload]')).toBeNull();
		expect(html).toContain('&lt;img');
		expect(html).toContain('&quot;');
		expect(html).toContain('&#39;');
		expect(html).toContain('&amp;');
	});

	it.each([
		`x" onmouseover="alert(1)`,
		`x"><img src=x onerror="alert(1)"><a href="`,
		`<svg onload='alert(1)'>`,
		`x&quot; onfocus=alert(1) & ' < >`
	])('contains hostile id %j inside exactly one href', (id) => {
		const popup = parse(buildPopupHtml([{ ...event, id }]));
		const links = popup.querySelectorAll('a');
		expect(links).toHaveLength(1);
		expect(links[0].getAttribute('href')).toBe(`/events/${id}`);
		expect(links[0].getAttributeNames().sort()).toEqual(['href', 'style']);
		expect(popup.querySelector('img, svg, script, [onmouseover], [onerror], [onfocus]')).toBeNull();
	});

	it('keeps valid event navigation when a location group contains multiple entries', () => {
		const popup = parse(
			buildPopupHtml([event, { ...event, id: event.id.toLowerCase(), location: null }])
		);
		expect([...popup.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
			`/events/${event.id}`,
			`/events/${event.id.toLowerCase()}`
		]);
	});
});
