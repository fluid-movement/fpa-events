import { describe, it, expect } from 'vitest';
import { emailTemplates, getTemplate, baseTemplate } from './templates';

describe('emailTemplates registry', () => {
	it('contains an activate-account and reset-password template', () => {
		expect(emailTemplates.map((t) => t.id)).toEqual(
			expect.arrayContaining(['activate-account', 'reset-password'])
		);
	});

	it('each template renders non-empty HTML containing its sample URL and button label', () => {
		expect(emailTemplates.length).toBeGreaterThan(0);
		for (const tpl of emailTemplates) {
			const html = tpl.render();
			expect(html).toBeTruthy();
			expect(html).toContain(tpl.sampleUrl);
		}
	});

	it('activate-account template contains the Activate Account button label', () => {
		const html = getTemplate('activate-account').render();
		expect(html).toContain('Activate Account');
	});

	it('reset-password template contains the Reset Password button label', () => {
		const html = getTemplate('reset-password').render();

		expect(html).toContain('Reset Password');
	});

	it('getTemplate throws on an unknown id', () => {
		expect(() => getTemplate('nope' as never)).toThrow(/Unknown email template/);
	});

	it('render uses a custom URL when provided', () => {
		const customUrl = 'https://custom.example.com/token';
		const html = getTemplate('reset-password').render(customUrl);
		expect(html).toContain(customUrl);
	});

	it('baseTemplate includes the app name and provided body', () => {
		const html = baseTemplate('Test Title', '<p>Body</p>');
		expect(html).toContain('FPA Events');
		expect(html).toContain('Test Title');
		expect(html).toContain('<p>Body</p>');
	});
});
