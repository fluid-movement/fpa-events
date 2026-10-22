const formats = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif'
} as const;

export type ImageType = keyof typeof formats;

export function imageExtension(type: ImageType): string {
	return formats[type];
}

/** Signature validation, not a full image decoder. Never trust the multipart MIME type. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
	const matches = (offset: number, signature: number[]) =>
		signature.every((byte, index) => bytes[offset + index] === byte);
	const ascii = (offset: number, value: string) =>
		matches(
			offset,
			Array.from(value, (char) => char.charCodeAt(0))
		);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	if (bytes.length >= 4 && matches(0, [0xff, 0xd8, 0xff]) && bytes[3] !== 0) {
		return 'image/jpeg';
	}
	if (
		bytes.length >= 33 &&
		matches(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
		view.getUint32(8) === 13 &&
		ascii(12, 'IHDR')
	)
		return 'image/png';
	if (bytes.length >= 13 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))) {
		return 'image/gif';
	}
	if (
		bytes.length >= 20 &&
		ascii(0, 'RIFF') &&
		ascii(8, 'WEBP') &&
		(ascii(12, 'VP8 ') || ascii(12, 'VP8L') || ascii(12, 'VP8X')) &&
		view.getUint32(4, true) + 8 === bytes.length
	)
		return 'image/webp';

	// AVIF is ISO BMFF: the first box must be a complete ftyp box, with an
	// avif/avis major or compatible brand. An arbitrary occurrence is not enough.
	if (bytes.length >= 16 && ascii(4, 'ftyp')) {
		const size = view.getUint32(0);
		if (size < 16 || size > bytes.length || size % 4 !== 0) return null;
		if (ascii(8, 'avif') || ascii(8, 'avis')) return 'image/avif';
		for (let offset = 16; offset < size; offset += 4) {
			if (ascii(offset, 'avif') || ascii(offset, 'avis')) return 'image/avif';
		}
	}
	return null;
}
