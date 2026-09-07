// File Storage Types
// Abstraction for file storage providers

export interface FileStorageConfig {
  provider: FileStorageProviderType;
  local?: {
    uploadDir: string;
    baseUrl?: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
    baseUrl?: string;
    forcePathStyle?: boolean;
  };
}

export type FileStorageProviderType = 'local' | 's3' | 'r2' | 'custom' | 'gcs' | 'azure';

export interface UploadFileOptions {
  key: string;
  content: Buffer | ReadableStream;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface FileStorageProvider {
  readonly providerType: FileStorageProviderType;

  upload(options: UploadFileOptions): Promise<FileMetadata>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata>;
  list(prefix?: string, limit?: number): Promise<FileMetadata[]>;
  getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
}