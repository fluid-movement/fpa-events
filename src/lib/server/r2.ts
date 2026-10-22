import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2Command,
	HeadObjectCommand
} from '@aws-sdk/client-s3';
import {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_URL
} from '$app/env/private';
import { ulid } from 'ulid';
import { imageExtension, type ImageType } from './image-type';

/** Uploads are immutable — the key carries a fresh ULID every time. */
const CACHE_CONTROL = 'public, max-age=31536000';

let client: S3Client | null = null;

export function r2Configured(): boolean {
	return Boolean(
		R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_PUBLIC_URL
	);
}

function publicUrl(key: string): string {
	return `${R2_PUBLIC_URL?.replace(/\/+$/, '')}/${key}`;
}

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

export async function uploadImage(
	bytes: Uint8Array,
	type: ImageType
): Promise<{ url: string; key: string }> {
	const key = `events/${ulid().toLowerCase()}.${imageExtension(type)}`;

	await r2().send(
		new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: Buffer.from(bytes),
			ContentType: type,
			CacheControl: CACHE_CONTROL
		})
	);

	return { url: publicUrl(key), key };
}

/** Called only after validating that the URL belongs to our upload prefix. */
export async function uploadedImageExists(url: string): Promise<boolean> {
	const prefix = publicUrl('events/');
	if (!r2Configured() || !url.startsWith(prefix)) return false;
	const key = `events/${url.slice(prefix.length)}`;
	try {
		await r2().send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'$metadata' in error &&
			(error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404
		)
			return false;
		throw error;
	}
}

export async function* listUploadedImages(): AsyncGenerator<{
	key: string;
	url: string;
	modified: Date;
}> {
	if (!r2Configured()) return;
	let continuation: string | undefined;
	do {
		const page = await r2().send(
			new ListObjectsV2Command({
				Bucket: R2_BUCKET_NAME,
				Prefix: 'events/',
				ContinuationToken: continuation,
				MaxKeys: 1000
			})
		);
		for (const object of page.Contents ?? []) {
			if (object.Key && object.LastModified) {
				yield { key: object.Key, url: publicUrl(object.Key), modified: object.LastModified };
			}
		}
		if (!page.IsTruncated) break;
		if (!page.NextContinuationToken || page.NextContinuationToken === continuation) {
			throw new Error('Invalid upload listing continuation');
		}
		continuation = page.NextContinuationToken;
	} while (continuation);
}

export async function deleteImage(url: string): Promise<void> {
	const key = url.replace(publicUrl(''), '');
	await r2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}
