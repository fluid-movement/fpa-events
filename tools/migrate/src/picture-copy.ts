import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	type S3Client
} from '@aws-sdk/client-s3';
import { ALLOWED_PICTURE_TYPES } from './picture-policy';

export type PictureCopyResult =
	| { status: 'present' }
	| { status: 'missing' }
	| { status: 'rejected'; contentType: string | undefined; bucket: 'legacy' | 'target' }
	| { status: 'copied'; bytes: number };

/** Copies only allowlisted raster objects, never trusting file extensions. */
export async function copyLegacyPicture(
	legacy: S3Client,
	target: S3Client,
	legacyBucket: string,
	targetBucket: string,
	key: string
): Promise<PictureCopyResult> {
	try {
		const existing = await target.send(new HeadObjectCommand({ Bucket: targetBucket, Key: key }));
		if (!existing.ContentType || !ALLOWED_PICTURE_TYPES.has(existing.ContentType)) {
			return { status: 'rejected', contentType: existing.ContentType, bucket: 'target' };
		}
		return { status: 'present' };
	} catch (err) {
		if (!(err instanceof Error && err.name === 'NotFound')) throw err;
	}

	let source;
	try {
		source = await legacy.send(new GetObjectCommand({ Bucket: legacyBucket, Key: key }));
	} catch (err) {
		if (err instanceof Error && (err.name === 'NoSuchKey' || err.name === 'NotFound')) {
			return { status: 'missing' };
		}
		throw err;
	}
	if (!source.ContentType || !ALLOWED_PICTURE_TYPES.has(source.ContentType)) {
		// Release the Node response stream without downloading a rejected object.
		if (source.Body && 'destroy' in source.Body) source.Body.destroy();
		return { status: 'rejected', contentType: source.ContentType, bucket: 'legacy' };
	}
	if (!source.Body) throw new Error(`Missing response body for legacy picture ${key}`);
	const body = await source.Body.transformToByteArray();
	await target.send(
		new PutObjectCommand({
			Bucket: targetBucket,
			Key: key,
			Body: body,
			ContentType: source.ContentType,
			CacheControl: 'public, max-age=31536000'
		})
	);
	return { status: 'copied', bytes: body.length };
}
