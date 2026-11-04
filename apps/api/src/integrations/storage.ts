import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { ApiError } from '../lib/errors';

export type StorageDriver = 's3' | 'local';

function detectDriver(): StorageDriver {
  if (env.STORAGE_DRIVER) return env.STORAGE_DRIVER;
  return env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID ? 's3' : 'local';
}

interface UploadResult {
  url: string;
  key: string;
}

export class StorageService {
  private driver: StorageDriver;

  constructor() {
    this.driver = detectDriver();
  }

  async upload(options: {
    buffer: Buffer;
    contentType: string;
    folder: string;
    filename?: string;
  }): Promise<UploadResult> {
    const key = this.makeKey(options.folder, options.filename || options.contentType.split('/')[0]);
    if (this.driver === 's3') {
      return this.uploadS3(key, options.buffer, options.contentType);
    }
    return this.uploadLocal(key, options.buffer, options.contentType);
  }

  async delete(key: string): Promise<void> {
    if (this.driver === 's3') {
      await this.deleteS3(key);
      return;
    }
    // local: remove file if we can
    try {
      const { unlink } = await import('node:fs/promises');
      const { join } = await import('node:path');
      await unlink(join(process.cwd(), 'uploads', key));
    } catch {
      /* ignore */
    }
  }

  private makeKey(folder: string, base: string): string {
    const date = new Date().toISOString().slice(0, 10);
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
    const hash = createHash('sha1').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 12);
    return `${folder}/${date}/${hash}${ext}`;
  }

  private async uploadS3(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      const publicUrl =
        env.S3_PUBLIC_URL.replace(/\/$/, '') + '/' + encodeURIComponent(key);
      return { url: publicUrl, key };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ApiError(502, 'STORAGE_ERROR', `Failed to upload to storage: ${message}`);
    }
  }

  private async uploadLocal(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join, dirname } = await import('node:path');
    const abs = join(process.cwd(), 'uploads', key);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    const url = `/uploads/${key}`;
    return { url, key };
  }

  private async deleteS3(key: string): Promise<void> {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
      });
      await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    } catch {
      /* ignore */
    }
  }
}

export const storage = new StorageService();
