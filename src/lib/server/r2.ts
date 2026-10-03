import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_URL
} from '$app/env/private';
import { ulid } from 'ulid';

/** Uploads are immutable — the key carries a fresh ULID every time. */
const CACHE_CONTROL = 'public, max-age=31536000';

let client: S3Client | null = null;

/**
 * Built once and reused: an S3Client owns a connection pool, so constructing a
 * fresh one per request threw that away. Lazy rather than module-level so the
 * environment is read at first use, not at import.
 */
function r2(): S3Client {
	client ??= new S3Client({
		region: 'auto',
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: R2_ACCESS_KEY_ID ?? '',
			secretAccessKey: R2_SECRET_ACCESS_KEY ?? ''
		}
	});
	return client;
}

/** `image/jpeg` -> `jpg`, and anything unrecognisable falls back to `jpg`. */
function extensionFor(mimeType: string): string {
	return mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
}

export async function uploadImage(file: File): Promise<{ url: string; key: string }> {
	const key = `events/${ulid().toLowerCase()}.${extensionFor(file.type)}`;

	await r2().send(
		new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: Buffer.from(await file.arrayBuffer()),
			ContentType: file.type,
			CacheControl: CACHE_CONTROL
		})
	);

	return { url: `${R2_PUBLIC_URL}/${key}`, key };
}

export async function deleteImage(url: string): Promise<void> {
	const key = url.replace(`${R2_PUBLIC_URL}/`, '');
	await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}
