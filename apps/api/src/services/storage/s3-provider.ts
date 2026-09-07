// S3-Compatible Storage Provider
// Supports AWS S3, Cloudflare R2, MinIO, and other S3-compatible storage

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { FileStorageProvider, FileStorageProviderType, FileMetadata, UploadFileOptions } from './types';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3StorageProvider implements FileStorageProvider {
  readonly providerType: FileStorageProviderType = 's3';
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(config: S3StorageConfig, baseUrl: string = '') {
    this.bucket = config.bucket;
    this.baseUrl = baseUrl;
    
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? false,
    });
  }

  private getContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      md: 'text/markdown',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
    };
    return contentTypeMap[ext] || 'application/octet-stream';
  }

  async upload(options: UploadFileOptions): Promise<FileMetadata> {
    const contentType = options.contentType || this.getContentType(options.key);
    
    let body: Buffer | Readable;
    if (Buffer.isBuffer(options.content)) {
      body = options.content;
    } else if (options.content instanceof Readable) {
      body = options.content;
    } else {
      throw new Error('Unsupported content type');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: body,
      ContentType: contentType,
      Metadata: options.metadata,
    });

    await this.client.send(command);

    return this.getMetadata(options.key);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    
    await this.client.send(command);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    
    const command = new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: true,
      },
    });
    
    await this.client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    
    return {
      key,
      size: response.ContentLength ?? 0,
      contentType: response.ContentType || this.getContentType(key),
      lastModified: response.LastModified ?? new Date(),
      metadata: response.Metadata,
    };
  }

  async list(prefix?: string, limit?: number): Promise<FileMetadata[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: limit,
    });

    const response = await this.client.send(command);
    
    return (response.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size ?? 0,
      contentType: this.getContentType(obj.Key!),
      lastModified: obj.LastModified ?? new Date(),
    }));
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}