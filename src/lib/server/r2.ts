import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { ulid } from 'ulid';

function getR2Client() {
	return new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
			secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? ''
		}
	});
}

export async function uploadImage(file: File): Promise<{ url: string; key: string }> {
	const r2 = getR2Client();
	const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
	const key = `events/${ulid().toLowerCase()}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	await r2.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: file.type,
			CacheControl: 'public, max-age=31536000'
		})
	);

	return { url: `${env.R2_PUBLIC_URL}/${key}`, key };
}

export async function deleteImage(url: string): Promise<void> {
	const r2 = getR2Client();
	const key = url.replace(`${env.R2_PUBLIC_URL}/`, '');
	await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
