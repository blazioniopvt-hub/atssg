// Storage Provider Factory
// Creates the appropriate storage provider based on configuration

import { FileStorageProvider, FileStorageConfig, FileStorageProviderType } from './types';
import { LocalStorageProvider } from './local-provider';
import { S3StorageProvider, S3StorageConfig } from './s3-provider';

export class StorageProviderFactory {
  static create(config: FileStorageConfig): FileStorageProvider {
    switch (config.provider) {
      case 'local':
        return new LocalStorageProvider(
          config.local?.uploadDir || './uploads',
          config.local?.baseUrl || ''
        );
      case 's3':
      case 'r2':
      case 'custom': {
        const s3Config: S3StorageConfig = {
          bucket: config.s3?.bucket || '',
          region: config.s3?.region || 'us-east-1',
          accessKeyId: config.s3?.accessKeyId || '',
          secretAccessKey: config.s3?.secretAccessKey || '',
          endpoint: config.s3?.endpoint,
          forcePathStyle: config.s3?.forcePathStyle,
        };
        return new S3StorageProvider(s3Config, config.s3?.baseUrl || '');
      }
      case 'gcs':
        // TODO: Implement GCS provider
        throw new Error('GCS provider not yet implemented');
      case 'azure':
        // TODO: Implement Azure Blob provider
        throw new Error('Azure Blob provider not yet implemented');
      default:
        throw new Error(`Unknown storage provider: ${config.provider}`);
    }
  }
}

// Convenience function to create provider from environment
export function createStorageProviderFromEnv(): FileStorageProvider {
  const providerType = (process.env.STORAGE_PROVIDER as FileStorageProviderType) || 'local';
  
  const config = {
    provider: providerType,
    local: {
      uploadDir: process.env.STORAGE_LOCAL_UPLOAD_DIR || './uploads',
      baseUrl: process.env.STORAGE_LOCAL_BASE_URL || '',
    },
    s3: {
      bucket: process.env.STORAGE_S3_BUCKET || '',
      region: process.env.STORAGE_S3_REGION || 'us-east-1',
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY || '',
      endpoint: process.env.STORAGE_S3_ENDPOINT,
      baseUrl: process.env.STORAGE_S3_BASE_URL,
      forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === 'true',
    },
  };

  return StorageProviderFactory.create(config);
}