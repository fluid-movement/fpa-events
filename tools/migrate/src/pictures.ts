// Bucket operations used only by the orchestrator. The legacy bucket is read-only.
import {
	ListObjectsV2Command,
	DeleteObjectsCommand,
	HeadObjectCommand,
	type S3Client
} from '@aws-sdk/client-s3';
import type pg from 'pg';
import { copyLegacyPicture } from './picture-copy';
import { ALLOWED_PICTURE_TYPES, hasLegacyPicture } from './picture-policy';

export interface Picture {
	id: string;
	name: string;
	picture: string;
}

export async function listPictures(legacy: Pick<pg.Pool, 'query'>): Promise<Picture[]> {
	const { rows } = await legacy.query<Picture>(
		`SELECT id, name, picture FROM events WHERE picture IS NOT NULL ORDER BY id`
	);
	return rows.filter(({ picture }) => hasLegacyPicture(picture));
}

export async function emptyBucket(
	client: S3Client,
	bucket: string,
	dryRun: boolean,
	log: (message: string) => void
): Promise<void> {
	let token: string | undefined;
	do {
		const page = await client.send(
			new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
		);
		const keys = (page.Contents ?? []).flatMap((o) =>
			o.Key !== undefined ? [{ Key: o.Key }] : []
		);
		for (const { Key } of keys)
			log(`${dryRun ? 'Would delete' : 'Deleting'} R2 ${JSON.stringify(Key)}`);
		if (!dryRun && keys.length > 0) {
			const result = await client.send(
				new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } })
			);
			if (result.Errors?.length) {
				throw new Error(`R2 deletion failed: ${JSON.stringify(result.Errors)}`);
			}
		}
		if (page.IsTruncated && (!page.NextContinuationToken || page.NextContinuationToken === token)) {
			throw new Error('R2 listing truncated without a new continuation token');
		}
		token = page.IsTruncated ? page.NextContinuationToken : undefined;
	} while (token);
}

/** HEAD only: used for dry-run source checks and final target verification. */
export async function verifyPictures(
	client: S3Client,
	bucket: string,
	keys: string[]
): Promise<string[]> {
	const errors: string[] = [];
	for (const key of new Set(keys)) {
		try {
			const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
			if (!object.ContentType || !ALLOWED_PICTURE_TYPES.has(object.ContentType)) {
				errors.push(
					`Disallowed picture ${JSON.stringify(key)} in ${bucket}: Content-Type ${JSON.stringify(object.ContentType ?? '(missing)')}`
				);
			}
		} catch (err) {
			if (!(err instanceof Error && ['NotFound', 'NoSuchKey'].includes(err.name))) throw err;
			errors.push(`Missing picture ${JSON.stringify(key)} in ${bucket}`);
		}
	}
	return errors;
}

export async function copyPictures(
	legacy: S3Client,
	target: S3Client,
	legacyBucket: string,
	targetBucket: string,
	pictures: Picture[],
	log: (message: string) => void
): Promise<void> {
	const failures: string[] = [];
	let copied = 0;
	let present = 0;
	for (const { name, picture: key } of pictures) {
		const result = await copyLegacyPicture(legacy, target, legacyBucket, targetBucket, key);
		if (result.status === 'present') present++;
		else if (result.status === 'copied') {
			copied++;
			log(`copied ${JSON.stringify(key)} (${result.bytes} bytes)`);
		} else if (result.status === 'missing') {
			failures.push(`missing: ${JSON.stringify(key)} (event ${JSON.stringify(name)})`);
		} else {
			failures.push(
				`rejected: ${JSON.stringify(key)} (event ${JSON.stringify(name)}): ${result.bucket} Content-Type ${JSON.stringify(result.contentType ?? '(missing)')}`
			);
		}
	}
	log(
		`${copied} copied, ${present} already present, ${failures.filter((f) => f.startsWith('missing')).length} missing in legacy bucket, ${failures.filter((f) => f.startsWith('rejected')).length} rejected by content type.`
	);
	for (const failure of failures) log(failure);
	if (failures.length) throw new Error('Picture import failed; see missing/rejected objects above');
}
