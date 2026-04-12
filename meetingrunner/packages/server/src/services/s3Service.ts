import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

const BUCKET = process.env.S3_BUCKET || 'meetingrunner';

export async function generatePresignedUploadUrl(fileKey: string, mimeType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ContentType: mimeType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteObject(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  await s3Client.send(command);
}
