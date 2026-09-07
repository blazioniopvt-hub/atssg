// Document Extraction Types
// Types for document text extraction

export type DocumentFileType = 'pdf' | 'docx' | 'txt';

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, string>;
  extractionMethod: 'pdf-parse' | 'pdf-text' | 'docx' | 'text' | 'ocr-required';
}

export interface ExtractionOptions {
  maxPages?: number;
  includeMetadata?: boolean;
  maxTextLength?: number;
}

export interface ExtractionError {
  code: 'UNSUPPORTED_FORMAT' | 'CORRUPTED_FILE' | 'PASSWORD_PROTECTED' | 'NO_TEXT_EXTRACTABLE' | 'FILE_TOO_LARGE' | 'EXTRACTION_FAILED';
  message: string;
  originalError?: Error;
}

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  metadata?: Record<string, string>;
  extractionMethod: 'pdf-parse' | 'pdf-text' | 'docx' | 'text' | 'ocr-required';
  warnings?: string[];
}

export interface DocumentExtractor {
  extract(buffer: Buffer, fileType: DocumentFileType, options?: ExtractionOptions): Promise<ExtractedDocument>;
  validate(buffer: Buffer, fileType: DocumentFileType): Promise<{ valid: boolean; error?: ExtractionError }>;
  getSupportedTypes(): DocumentFileType[];
}