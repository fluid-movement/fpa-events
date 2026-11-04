import { test, expect, type Page } from '@playwright/test';
import { captureRemoteForm, callRemoteForm, postRemoteForm } from './helpers/forms';
import { signUpAndSignIn } from './helpers/auth';
import {
	addCrewMember,
	closeDb,
	createCrewInvite,
	createTestCrew,
	createTestUser,
	deleteCrewsInCountry,
	deleteUserByEmail,
	getCrewMemberRole,
	getTestUserId,
	getUserCrewIds,
	setShowName,
	sql,
	userExists
} from './helpers/db';
import { installErrorGuard, expectConsoleErrors } from './helpers/console';

installErrorGuard(test);

const COUNTRY = 'Membership Spec Country';
const ACTOR = {
	email: 'crew-membership-actor@playwright.local',
	password: 'crew-membership-password-123',
	name: 'Membership Actor'
};
const ADMIN_EMAIL = 'crew-membership-admin@playwright.local';
const HIDDEN_EMAIL = 'crew-membership-hidden@playwright.local';

async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

async function confirm(page: Page, trigger: string, button: string) {
	await page.getByTestId(trigger).click();
	await page.getByTestId(button).click();
	await page.waitForLoadState('networkidle');
}

test.describe('crew membership and invitations', () => {
	let actorId: string;
	let adminId: string;
	let target: string;

	test.beforeEach(async ({ page, context }) => {
		await deleteCrewsInCountry(COUNTRY);
		await signUpAndSignIn(page, context, ACTOR);
		actorId = await getTestUserId(ACTOR.email);
		adminId = await createTestUser(ADMIN_EMAIL, 'Other Crew Admin');
		target = await createTestCrew(adminId, 'Target Crew', COUNTRY);
	});

	test.afterAll(async () => {
		await deleteCrewsInCountry(COUNTRY);
		for (const email of [ACTOR.email, ADMIN_EMAIL, HIDDEN_EMAIL]) await deleteUserByEmail(email);
		await closeDb();
	});

	test('GET only previews; accepting joins as member and repeated acceptance preserves an admin role', async ({
		page
	}) => {
		const token = await createCrewInvite(target);
		await open(page, `/crews/join/${token}`);
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([]);
		await page.getByTestId('accept-crew-invite').click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/crews/${target}`);
		await expect.poll(() => getCrewMemberRole(target, actorId)).toBe('member');
		await sql()`UPDATE crew_members SET role = 'admin' WHERE user_id = ${actorId}`;
		await open(page, `/crews/join/${token}`);
		await expect(page.getByText('You already belong to this crew.')).toBeVisible();
		await expect.poll(() => getCrewMemberRole(target, actorId)).toBe('admin');
	});

	test('switch confirmation replaces the old membership with exactly one member seat', async ({
		page
	}) => {
		const sourceAdmin = await createTestUser(HIDDEN_EMAIL);
		const source = await createTestCrew(sourceAdmin, 'Source Crew', COUNTRY);
		await addCrewMember(source, actorId, 'member');
		const token = await createCrewInvite(target);
		await open(page, `/crews/join/${token}`);
		await expect(page.getByText('You are in Source Crew; switch to Target Crew?')).toBeVisible();
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([source]);
		await confirm(page, 'switch-crew', 'confirm-switch-crew');
		await expect(page).toHaveURL(`/crews/${target}`);
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([target]);
		await expect.poll(() => getCrewMemberRole(target, actorId)).toBe('member');
	});

	test('last admin cannot leave, demote, remove, switch or delete their account; promotion unlocks leaving', async ({
		page
	}) => {
		const source = await createTestCrew(actorId, 'Source Crew', COUNTRY);
		const memberId = await createTestUser(HIDDEN_EMAIL, 'Future Admin');
		await addCrewMember(source, memberId, 'member');
		await open(page, `/crews/${source}`);
		await expect(page.getByTestId('crew-admin-prompt')).toContainText('Name another crew admin');
		await expect(page.getByTestId('leave-crew')).toHaveCount(0);
		await open(page, `/crews/${source}/admin/members`);
		await expect(page.getByTestId(`demote-${actorId}`)).toHaveCount(0);
		await expect(page.getByTestId(`remove-${actorId}`)).toHaveCount(0);
		const token = await createCrewInvite(target);
		await open(page, `/crews/join/${token}`);
		await expect(page.getByTestId('crew-admin-prompt')).toContainText('Name another crew admin');
		await expect(page.getByTestId('switch-crew')).toHaveCount(0);
		await open(page, '/settings/account');
		await page.getByTestId('open-delete-account').click();
		await page.getByTestId('delete-account-password').fill(ACTOR.password);
		await page.getByTestId('confirm-delete-account').click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('delete-account-error')).toContainText('Name another crew admin');
		await expect.poll(() => userExists(ACTOR.email)).toBe(true);
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([source]);
		await open(page, `/crews/${source}/admin/members`);
		await page.getByTestId(`promote-${memberId}`).click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getCrewMemberRole(source, memberId)).toBe('admin');
		await open(page, `/crews/${source}`);
		await confirm(page, 'leave-crew', 'confirm-leave-crew');
		await expect(page).toHaveURL('/');
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([]);
	});

	test('sole member leaving requires confirmation and deletes the crew and its links', async ({
		page
	}) => {
		const source = await createTestCrew(actorId, 'Solo Crew', COUNTRY);
		const token = await createCrewInvite(source);
		await open(page, `/crews/${source}`);
		await page.getByTestId('leave-crew').click();
		await expect(page.getByRole('alertdialog')).toContainText('Leave and delete crew?');
		await expect
			.poll(async () => (await sql()`SELECT id FROM crews WHERE id = ${source}`).length)
			.toBe(1);
		await page.getByTestId('confirm-leave-crew').click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL('/');
		await expect
			.poll(async () => (await sql()`SELECT id FROM crews WHERE id = ${source}`).length)
			.toBe(0);
		await expect
			.poll(async () => (await sql()`SELECT id FROM crew_magic_links WHERE id = ${token}`).length)
			.toBe(0);
	});

	test('public list counts hidden members without exposing their names, including to signed-out visitors', async ({
		page,
		context
	}) => {
		const hiddenId = await createTestUser(HIDDEN_EMAIL, 'Secret Crew Person');
		await addCrewMember(target, hiddenId, 'member');
		await setShowName(adminId, true);
		await setShowName(hiddenId, false);
		await context.clearCookies();
		await open(page, `/crews/${target}`);
		await expect(page.getByTestId('crew-members')).toContainText('Other Crew Admin');
		await expect(page.getByTestId('crew-hidden-count')).toHaveText('+ 1 others');
		await expect(page.getByText('Secret Crew Person')).toHaveCount(0);
		// Server data is embedded in the document; the hidden name must not leak there either.
		const response = await page.request.get(`/crews/${target}`);
		expect(await response.text()).not.toContain('Secret Crew Person');
	});

	test('admins can promote, demote and remove another member', async ({ page }) => {
		await addCrewMember(target, actorId, 'admin');
		const memberId = await createTestUser(HIDDEN_EMAIL, 'Managed Member');
		await addCrewMember(target, memberId, 'member');
		await open(page, `/crews/${target}/admin/members`);
		await page.getByTestId(`promote-${memberId}`).click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getCrewMemberRole(target, memberId)).toBe('admin');
		await confirm(page, `demote-${memberId}`, `confirm-demote-${memberId}`);
		await expect.poll(() => getCrewMemberRole(target, memberId)).toBe('member');
		await confirm(page, `remove-${memberId}`, `confirm-remove-${memberId}`);
		await expect(page).toHaveURL(`/crews/${target}`);
		await expect.poll(() => getCrewMemberRole(target, memberId)).toBeNull();
	});

	test('simultaneous acceptances preserve one crew per user', async ({ page }) => {
		expectConsoleErrors(page);
		const otherAdmin = await createTestUser(HIDDEN_EMAIL);
		const otherCrew = await createTestCrew(otherAdmin, 'Other Crew', COUNTRY);
		const firstToken = await createCrewInvite(target);
		const secondToken = await createCrewInvite(otherCrew);
		await open(page, `/crews/join/${firstToken}`);
		const first = await captureRemoteForm(page, 'acceptInvite');
		await open(page, `/crews/join/${secondToken}`);
		const second = await captureRemoteForm(page, 'acceptInvite');
		const results = await Promise.all([callRemoteForm(page, first), callRemoteForm(page, second)]);
		expect(results.filter((r) => r.type === 'error')).toHaveLength(1);
		expect(results.find((r) => r.type === 'error')).toMatchObject({ error: { status: 409 } });
		await expect.poll(async () => (await getUserCrewIds(actorId)).length).toBe(1);
		const ids = await getUserCrewIds(actorId);
		expect([target, otherCrew]).toContain(ids[0]);
		await expect.poll(() => getCrewMemberRole(ids[0], actorId)).toBe('member');
	});

	test('server rejects stale leave, demotion, removal and switch forms for the last admin', async ({
		page
	}) => {
		expectConsoleErrors(page);
		const source = await createTestCrew(actorId, 'Source Crew', COUNTRY);
		const otherId = await createTestUser(HIDDEN_EMAIL);
		await addCrewMember(source, otherId, 'admin');
		await open(page, `/crews/${source}`);
		const leave = await captureRemoteForm(page, 'leaveCrew');
		await open(page, `/crews/${source}/admin/members`);
		const demote = await captureRemoteForm(page, 'changeRole');
		const remove = await captureRemoteForm(page, 'removeMember');
		const token = await createCrewInvite(target);
		await open(page, `/crews/join/${token}`);
		const join = await captureRemoteForm(page, 'acceptInvite');
		await sql()`UPDATE crew_members SET role = 'member' WHERE user_id = ${otherId}`;
		for (const [form, overrides] of [
			[leave, {}],
			[demote, { userId: actorId, role: 'member' }],
			[remove, { userId: actorId }],
			[join, {}]
		] as const) {
			const result = await callRemoteForm(page, form, overrides);
			expect(result).toMatchObject({ type: 'error', error: { status: 400 } });
			await expect.poll(() => getUserCrewIds(actorId)).toEqual([source]);
			await expect.poll(() => getCrewMemberRole(source, actorId)).toBe('admin');
		}
	});

	test('management POSTs reject ordinary members and anonymous callers', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await addCrewMember(target, actorId, 'admin');
		await open(page, `/crews/${target}/admin/members`);
		const generate = await captureRemoteForm(page, 'generateLink');
		const demote = await captureRemoteForm(page, 'changeRole');
		const remove = await captureRemoteForm(page, 'removeMember');
		const token = await createCrewInvite(target);
		await open(page, `/crews/${target}/admin/members`);
		const revoke = await captureRemoteForm(page, 'revokeLink');
		await sql()`UPDATE crew_members SET role = 'member' WHERE user_id = ${actorId}`;
		for (const form of [generate, demote, remove, revoke]) {
			expect(await callRemoteForm(page, form)).toMatchObject({
				type: 'error',
				error: { status: 403 }
			});
		}
		await context.clearCookies();
		expect(await callRemoteForm(page, generate)).toMatchObject({
			type: 'error',
			error: { status: 401 }
		});
		await expect
			.poll(async () => (await sql()`SELECT id FROM crew_magic_links WHERE id = ${token}`).length)
			.toBe(1);
		await expect.poll(() => getCrewMemberRole(target, adminId)).toBe('admin');
	});

	test('acceptance rechecks expiry and revocation and rejects cross-origin POSTs', async ({
		page
	}) => {
		expectConsoleErrors(page);
		const token = await createCrewInvite(target);
		await open(page, `/crews/join/${token}`);
		const join = await captureRemoteForm(page, 'acceptInvite');
		const crossOrigin = await postRemoteForm(page, join, {}, 'https://other.example');
		expect(crossOrigin.status()).toBe(403);
		await sql()`UPDATE crew_magic_links SET expires_at = NOW() - INTERVAL '1 second' WHERE id = ${token}`;
		expect(await callRemoteForm(page, join)).toMatchObject({
			type: 'error',
			error: { status: 410 }
		});
		await sql()`DELETE FROM crew_magic_links WHERE id = ${token}`;
		expect(await callRemoteForm(page, join)).toMatchObject({
			type: 'error',
			error: { status: 404 }
		});
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([]);
	});

	test('ordinary members cannot reach management pages', async ({ page }) => {
		expectConsoleErrors(page);
		await addCrewMember(target, actorId, 'member');
		for (const path of [`/crews/${target}/admin`, `/crews/${target}/admin/members`]) {
			const response = await page.goto(path);
			await page.waitForLoadState('networkidle');
			expect(response?.status()).toBe(403);
		}
	});

	test('admins can issue several links, revoke one, and expired links never join', async ({
		page
	}) => {
		expectConsoleErrors(page);
		await addCrewMember(target, actorId, 'admin');
		await open(page, `/crews/${target}/admin/members`);
		for (let i = 0; i < 2; i++) {
			await page.getByTestId('generate-crew-link').click();
			await page.waitForLoadState('networkidle');
			await expect(page.getByTestId('crew-invite-url')).toHaveCount(i + 1);
		}
		const urls = await page
			.getByTestId('crew-invite-url')
			.evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
		const token = urls[0].split('/').at(-1)!;
		await confirm(page, `revoke-${token}`, `confirm-revoke-${token}`);
		await expect
			.poll(async () => (await sql()`SELECT id FROM crew_magic_links WHERE id = ${token}`).length)
			.toBe(0);
		const revoked = await page.goto(urls[0]);
		await page.waitForLoadState('networkidle');
		expect(revoked?.status()).toBe(404);
		await sql()`DELETE FROM crew_members WHERE user_id = ${actorId}`;
		const expired = await createCrewInvite(target, new Date(Date.now() - 1000));
		await open(page, `/crews/join/${expired}`);
		await expect(page.getByText('Invite link expired')).toBeVisible();
		await expect(page.getByTestId('accept-crew-invite')).toHaveCount(0);
		await expect.poll(() => getUserCrewIds(actorId)).toEqual([]);
	});
});
