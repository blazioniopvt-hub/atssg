// Local File Storage Provider
// Stores files on the local filesystem

import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { FileStorageProvider, FileStorageProviderType, FileMetadata, UploadFileOptions } from './types';

export class LocalStorageProvider implements FileStorageProvider {
  readonly providerType: FileStorageProviderType = 'local';
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(uploadDir: string, baseUrl: string = '') {
    this.uploadDir = resolve(uploadDir);
    this.baseUrl = baseUrl;
    
    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    // Prevent path traversal attacks
    const normalizedKey = key.replace(/\\/g, '/').replace(/\.\./g, '');
    return resolve(this.uploadDir, normalizedKey);
  }

  private getRelativePath(fullPath: string): string {
    return fullPath.replace(this.uploadDir, '').replace(/^\\/, '');
  }

  private async contentToBuffer(content: Buffer | ReadableStream): Promise<Buffer> {
    if (Buffer.isBuffer(content)) {
      return content;
    }
    
    // Handle Node.js Readable stream
    if (content instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of content) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
    
    // Handle Web ReadableStream
    if (content instanceof ReadableStream) {
      const reader = content.getReader();
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      return Buffer.concat(chunks.map(c => Buffer.from(c)));
    }
    
    throw new Error('Unsupported content type');
  }

  async upload(options: UploadFileOptions): Promise<FileMetadata> {
    const fullPath = this.getFullPath(options.key);
    const dir = dirname(fullPath);
    
    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const buffer = await this.contentToBuffer(options.content);

    // Write file
    await pipeline(
      Readable.from(buffer),
      createWriteStream(this.getFullPath(options.key))
    );

    return this.getMetadata(options.key);
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(fullPath);
      
      stream.on('data', (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.delete(key)));
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return existsSync(fullPath);
  }

  async getMetadata(key: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(key);
    
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }

    const stats = statSync(fullPath);
    const ext = key.split('.').pop()?.toLowerCase() || '';
    
    // Determine content type from extension
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

    return {
      key,
      size: stats.size,
      contentType: ext ? contentTypeMap[ext] || 'application/octet-stream' : 'application/octet-stream',
      lastModified: stats.mtime,
    };
  }

  async list(prefix?: string, limit?: number): Promise<FileMetadata[]> {
    const searchDir = prefix ? this.getFullPath(prefix) : this.uploadDir;
    
    if (!existsSync(searchDir)) {
      return [];
    }

    const files = readdirSync(searchDir, { withFileTypes: true });
    const results: FileMetadata[] = [];

    for (const file of files) {
      if (limit && results.length >= limit) break;
      
      const fullPath = join(searchDir, file.name);
      const relativeKey = this.getRelativePath(fullPath);
      
      if (file.isFile()) {
        results.push(await this.getMetadata(relativeKey));
      } else if (file.isDirectory()) {
        // Recursively list subdirectories
        const subFiles = await this.list(this.getRelativePath(fullPath), limit ? limit - results.length : undefined);
        results.push(...subFiles);
      }
    }

    return results;
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return a URL that the frontend can use to upload
    // In a real implementation, this would be a signed URL
    return `${this.baseUrl}/api/storage/upload?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`;
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return a direct download URL
    return `${this.baseUrl}/api/storage/download?key=${encodeURIComponent(key)}`;
  }
}