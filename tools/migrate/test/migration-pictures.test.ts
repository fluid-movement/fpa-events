import { describe, expect, it, vi } from 'vitest';
import { copyLegacyPicture } from '../src/picture-copy';
import { legacyPictureUrl } from '../src/picture-policy';
import { migrationFixture, runMigrationCli, eventId } from './helpers/migration-cli';

// The tool may resolve its own @aws-sdk copy (tools/migrate/node_modules), so
// identify commands by name and take the client type from the tool itself.
type S3Client = Parameters<typeof copyLegacyPicture>[0];
type Command = { constructor: { name: string }; input: Record<string, unknown> };
const isCommand = (command: unknown, name: string): command is Command =>
	(command as Command | null)?.constructor?.name === name;

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const rejectedTypes = [
	'image/svg+xml',
	'text/html',
	undefined,
	'Image/JPEG',
	'image/jpeg; charset=binary'
];

describe('actual picture migration CLI', () => {
	it('reports every rejected legacy/target key and type and exits 1', () => {
		const fixture = migrationFixture();
		fixture.rows.events = [];
		fixture.legacyObjects = {};
		fixture.targetObjects = {};
		for (const bucket of ['legacy', 'target'] as const) {
			for (const [index, contentType] of rejectedTypes.entries()) {
				const key = `pictures/${bucket}-${index}-"unsafe".jpg`;
				fixture.rows.events.push({ name: `Rejected ${bucket} ${index}`, picture: key });
				fixture[`${bucket}Objects`]![key] = { contentType };
			}
		}
		const result = runMigrationCli('pictures', fixture);
		expect(result.status, result.stderr).toBe(1);
		for (const bucket of ['legacy', 'target'] as const) {
			for (const [index, contentType] of rejectedTypes.entries()) {
				const key = `pictures/${bucket}-${index}-"unsafe".jpg`;
				expect(result.stdout).toContain(
					`rejected: ${JSON.stringify(key)} (event "Rejected ${bucket} ${index}"): ${bucket} Content-Type ${JSON.stringify(contentType ?? '(missing)')}`
				);
			}
		}
		expect(result.stdout).toContain('10 rejected by content type.');
		expect(result.state.commands.some(({ command }) => command === 'PutObjectCommand')).toBe(false);
		expect(result.state.objects).toEqual(fixture.targetObjects);
	});

	it('copies safe legacy objects, accepts safe target objects, and exits 0', () => {
		const fixture = migrationFixture();
		fixture.rows.events = [];
		fixture.legacyObjects = {};
		fixture.targetObjects = {};
		for (const [index, contentType] of allowedTypes.entries()) {
			const key = `pictures/copy-${index}`;
			const present = `pictures/present-${index}`;
			fixture.rows.events.push(
				{ name: 'Copy', picture: key },
				{ name: 'Present', picture: present }
			);
			fixture.legacyObjects[key] = { contentType, body: [4, 5, 6] };
			fixture.targetObjects[present] = { contentType, body: [7, 8, 9] };
		}
		const result = runMigrationCli('pictures', fixture);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toContain(
			'5 copied, 5 already present, 0 missing in legacy bucket, 0 rejected'
		);
		for (const [index, contentType] of allowedTypes.entries()) {
			expect(result.state.objects[`pictures/copy-${index}`]).toEqual({
				contentType,
				body: [4, 5, 6]
			});
			expect(result.state.objects[`pictures/present-${index}`]).toEqual({
				contentType,
				body: [7, 8, 9]
			});
		}
	});

	it('uses identical blank-key filtering in the DB importer and the copy CLI', () => {
		const fixture = migrationFixture();
		const blankKeys = [null, '', ' ', '\t', '\n', '\r\n\t ', '\u00a0', '\ufeff'];
		const realKey = ' pictures/real.png ';
		fixture.rows.events = [...blankKeys, realKey].map((picture, index) => ({
			...fixture.rows.events[0],
			id: `${eventId.slice(0, -2)}${String(index).padStart(2, '0')}`,
			picture
		}));
		fixture.rows.event_user = [];
		fixture.rows.event_magic_links = [];
		fixture.rows.schedules = [];
		fixture.legacyObjects = { [realKey]: { contentType: 'image/png', body: [1, 2] } };
		const db = runMigrationCli('migrate', fixture);
		expect(db.status, db.stderr).toBe(0);
		expect(db.state.tables.events.map((params) => params[8])).toEqual([
			...blankKeys.map(() => null),
			'https://pictures.example/%20pictures/real.png%20'
		]);
		const pictures = runMigrationCli('pictures', fixture);
		expect(pictures.status, pictures.stderr).toBe(0);
		expect(pictures.stdout).toContain('1 event picture(s) to check');
		expect(pictures.state.commands.map(({ key }) => key)).toEqual([realKey, realKey, realKey]);
		expect(Object.keys(pictures.state.objects)).toEqual([realKey]);
	});
});

function fixture(contentType: string | undefined) {
	const bytes = new Uint8Array([1, 2, 3]);
	const body = { transformToByteArray: vi.fn().mockResolvedValue(bytes), destroy: vi.fn() };
	const uploaded = new Map<string, { body: unknown; type: unknown }>();
	const legacySend = vi.fn(async (command: unknown) => {
		if (!isCommand(command, 'GetObjectCommand')) throw new Error('Unexpected legacy command');
		return { Body: body, ContentType: contentType };
	});
	const targetSend = vi.fn(async (command: unknown) => {
		if (isCommand(command, 'HeadObjectCommand')) {
			throw Object.assign(new Error('Not found'), { name: 'NotFound' });
		}
		if (!isCommand(command, 'PutObjectCommand')) throw new Error('Unexpected target command');
		if (command.input.Bucket !== 'target') throw new Error('Wrong destination');
		uploaded.set(command.input.Key as string, {
			body: command.input.Body,
			type: command.input.ContentType
		});
		return {};
	});
	const copy = () =>
		copyLegacyPicture(
			{ send: legacySend } as unknown as S3Client,
			{ send: targetSend } as unknown as S3Client,
			'legacy',
			'target',
			'pictures/photo.jpg'
		);
	return { copy, uploaded, body, bytes, legacySend, targetSend };
}

describe('legacy picture copying', () => {
	it.each([
		'image/svg+xml',
		'text/html',
		'application/xhtml+xml',
		'image/bmp',
		'image/*',
		'',
		undefined,
		'Image/JPEG',
		'image/jpeg; charset=binary'
	])('never publishes disallowed or missing Content-Type %j, even with a jpg key', async (type) => {
		const { copy, uploaded, body } = fixture(type);
		expect(await copy()).toEqual({ status: 'rejected', contentType: type, bucket: 'legacy' });
		expect(uploaded.size).toBe(0);
		expect(body.transformToByteArray).not.toHaveBeenCalled();
		expect(body.destroy).toHaveBeenCalledOnce();
	});

	it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])(
		'copies allowed %s with the original bytes and content type',
		async (type) => {
			const { copy, uploaded, bytes } = fixture(type);
			expect(await copy()).toEqual({ status: 'copied', bytes: 3 });
			expect(uploaded.get('pictures/photo.jpg')).toEqual({ body: bytes, type });
		}
	);

	it.each(allowedTypes)('preserves idempotent skips for existing %s objects', async (type) => {
		const { copy, targetSend, legacySend, uploaded } = fixture('image/jpeg');
		targetSend.mockResolvedValueOnce({ ContentType: type });
		expect(await copy()).toEqual({ status: 'present' });
		expect(legacySend).not.toHaveBeenCalled();
		expect(uploaded.size).toBe(0);
	});

	it.each(rejectedTypes)(
		'rejects existing target objects with type %j without accepting or overwriting them',
		async (type) => {
			const { copy, targetSend, legacySend, uploaded } = fixture('image/jpeg');
			targetSend.mockResolvedValueOnce({ ContentType: type });
			expect(await copy()).toEqual({ status: 'rejected', contentType: type, bucket: 'target' });
			expect(legacySend).not.toHaveBeenCalled();
			expect(uploaded.size).toBe(0);
		}
	);

	it.each(['NoSuchKey', 'NotFound'])('reports missing source objects (%s)', async (name) => {
		const { copy, legacySend, uploaded } = fixture('image/jpeg');
		legacySend.mockRejectedValueOnce(Object.assign(new Error('missing'), { name }));
		expect(await copy()).toEqual({ status: 'missing' });
		expect(uploaded.size).toBe(0);
	});

	it('propagates storage failures instead of treating them as missing', async () => {
		const { copy, targetSend, uploaded } = fixture('image/jpeg');
		targetSend.mockRejectedValueOnce(new Error('AccessDenied'));
		await expect(copy()).rejects.toThrow('AccessDenied');
		expect(uploaded.size).toBe(0);
	});
});

describe('legacy picture URLs', () => {
	it.each([null, '', ' ', '\t\n '])('does not create a URL for blank key %j', (key) => {
		expect(legacyPictureUrl('https://pictures.example', key)).toBeNull();
	});

	it('preserves nonblank object keys exactly', () => {
		expect(legacyPictureUrl('https://pictures.example', 'pictures/photo.jpg')).toBe(
			'https://pictures.example/pictures/photo.jpg'
		);
		expect(legacyPictureUrl('https://pictures.example', ' pictures/photo.jpg ')).toBe(
			'https://pictures.example/%20pictures/photo.jpg%20'
		);
	});
});
