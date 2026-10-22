import { describe, expect, it } from 'vitest';
import { detectImageType, imageExtension } from './image-type';

// Actual file signatures and format headers, independent of client MIME/name.
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
	'base64'
);
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const webp = Buffer.from('5249464616000000574542505650384c0a0000002f0000000007d0fffef7', 'hex');
const avif = Buffer.from('00000018667479706176696600000000617669666d696631', 'hex');

describe('raster signatures', () => {
	it.each([
		['image/jpeg', Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'), 'jpg'],
		['image/png', png, 'png'],
		['image/gif', gif, 'gif'],
		['image/gif', Buffer.concat([Buffer.from('GIF87a'), gif.subarray(6)]), 'gif'],
		['image/webp', webp, 'webp'],
		['image/avif', avif, 'avif'],
		['image/avif', Buffer.from('00000018667479706d69663100000000617669736d696631', 'hex'), 'avif']
	])('detects %s from bytes', (type, bytes, extension) => {
		const detected = detectImageType(bytes);
		expect(detected).toBe(type);
		expect(imageExtension(detected!)).toBe(extension);
	});

	it.each([
		Buffer.from('<html><script>alert(1)</script></html>'),
		Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
		Buffer.alloc(0),
		png.subarray(0, 7),
		png.subarray(0, 32),
		gif.subarray(0, 6),
		webp.subarray(0, 15),
		avif.subarray(0, 20),
		Buffer.from('ffd8ff', 'hex'),
		Buffer.from('00000018667479706865696300000000686569636d696631', 'hex'),
		Buffer.from('not an avif file: avif'),
		Buffer.from('5249464616000000574156455650384c0a0000002f0000000007d0fffef7', 'hex')
	])('rejects unrecognized or truncated bytes (%j)', (bytes) => {
		expect(detectImageType(bytes)).toBeNull();
	});
});
