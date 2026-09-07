// Document Extraction Service
// Extracts text from PDF, DOCX, and TXT files

import { DocumentExtractor, ExtractedDocument, DocumentFileType, ExtractionOptions, ExtractionError } from './types';

export class DocumentExtractionService implements DocumentExtractor {
  async extract(buffer: Buffer, fileType: DocumentFileType, options?: ExtractionOptions): Promise<ExtractedDocument> {
    // Validate input
    const validation = await this.validate(buffer, fileType);
    if (!validation.valid) {
      throw validation.error || new Error('Invalid file');
    }

    // Check size limits
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      throw {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      } as ExtractionError;
    }

    // Check text length limit
    const maxTextLength = options?.maxTextLength ?? 1000000; // 1M characters
    
    try {
      let result: ExtractedDocument;

      switch (fileType) {
        case 'pdf':
          result = await this.extractFromPdf(buffer, options);
          break;
        case 'docx':
          result = await this.extractFromDocx(buffer, options);
          break;
        case 'txt':
          result = await this.extractFromText(buffer, options);
          break;
        default:
          throw {
            code: 'UNSUPPORTED_FORMAT',
            message: `Unsupported file type: ${fileType}`,
          } as ExtractionError;
      }

      // Truncate text if it exceeds max length
      if (result.text.length > maxTextLength) {
        result.text = result.text.substring(0, maxTextLength);
        result.warnings = [...(result.warnings || []), 'Text truncated to maximum length'];
      }

      return result;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error; // Re-throw extraction errors
      }
      throw {
        code: 'EXTRACTION_FAILED',
        message: `Failed to extract text from ${fileType} document`,
        originalError: error instanceof Error ? error : new Error(String(error)),
      } as ExtractionError;
    }
  }

  async validate(buffer: Buffer, fileType: DocumentFileType): Promise<{ valid: boolean; error?: ExtractionError }> {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: { code: 'CORRUPTED_FILE', message: 'Empty file' } };
    }

    // Check magic bytes for file type validation
    const validation = this.validateMagicBytes(buffer, fileType);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    return { valid: true };
  }

  getSupportedTypes(): DocumentFileType[] {
    return ['pdf', 'docx', 'txt'];
  }

  private async extractFromPdf(buffer: Buffer, options?: ExtractionOptions): Promise<ExtractedDocument> {
    // Dynamic import to avoid bundling issues
    let pdfParse: any;
    let pdfText: any;
    
    try {
      pdfParse = await import('pdf-parse');
    } catch {
      // pdf-parse not available
    }

    // Try pdf-parse first (robust PDF text extractor)
    if (pdfParse) {
      try {
        const data = await pdfParse.default(buffer, {
          max: options?.maxPages || 0, // 0 = all pages
        });
        
        if (data && data.text && data.text.trim().length > 0) {
          return {
            text: data.text.trim(),
            pageCount: data.numpages,
            metadata: data.metadata ? {
              title: data.metadata.Title,
              author: data.metadata.Author,
              subject: data.metadata.Subject,
              creator: data.metadata.Creator,
              producer: data.metadata.Producer,
              creationDate: data.metadata.CreationDate,
              modificationDate: data.metadata.ModDate,
            } : undefined,
            extractionMethod: 'pdf-parse',
          };
        }
      } catch (error) {
        // Fallback to text buffer decoding if pdf-parse encounters issue
      }
    }

    // Direct buffer text decoding as fallback
    const rawText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    if (rawText.length > 20) {
      return {
        text: rawText,
        extractionMethod: 'text',
      };
    }

    // No PDF libraries available
    throw {
      code: 'EXTRACTION_FAILED',
      message: 'No PDF extraction library available. Please install pdf-parse or pdf-text.',
    } as ExtractionError;
  }

  private async extractFromDocx(buffer: Buffer, options?: ExtractionOptions): Promise<ExtractedDocument> {
    let mammoth: any;
    
    try {
      mammoth = (await import('mammoth')).default;
    } catch {
      throw {
        code: 'EXTRACTION_FAILED',
        message: 'mammoth library not available for DOCX extraction. Please install mammoth.',
      } as ExtractionError;
    }

    try {
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.messages && result.messages.length > 0) {
        const warnings = result.messages.map((m: any) => m.message);
        return {
          text: result.value.trim(),
          extractionMethod: 'docx',
          warnings,
        };
      }

      return {
        text: result.value.trim(),
        extractionMethod: 'docx',
      };
    } catch (error) {
      throw {
        code: 'EXTRACTION_FAILED',
        message: 'Failed to extract text from DOCX document',
        originalError: error instanceof Error ? error : new Error(String(error)),
      } as ExtractionError;
    }
  }

  private async extractFromText(buffer: Buffer, options?: ExtractionOptions): Promise<ExtractedDocument> {
    // Try UTF-8 first
    let text: string;
    try {
      text = buffer.toString('utf-8');
    } catch {
      // Fallback to latin1 if UTF-8 fails
      text = buffer.toString('latin1');
    }
    
    // Check for encoding issues
    if (this.hasEncodingIssues(text)) {
      // Try latin1 as fallback for encoding issues
      try {
        text = buffer.toString('latin1');
      } catch {
        // If all else fails, use UTF-8 and replace invalid chars
        text = buffer.toString('utf-8').replace(/\uFFFD/g, '?');
      }
    }

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Normalize whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]+$/gm, ''); // Trim trailing whitespace
    text = text.trim();

    return {
      text,
      extractionMethod: 'text',
    };
  }

  private hasEncodingIssues(text: string): boolean {
    // Check for common encoding issues
    const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
    const totalChars = text.length;
    return replacementCharCount > totalChars * 0.01; // More than 1% replacement chars
  }

  validateMagicBytes(buffer: Buffer, fileType: string): { valid: boolean; error?: ExtractionError } {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: { code: 'CORRUPTED_FILE', message: 'Empty file' } };
    }

    if (buffer.length < 4 && fileType.toLowerCase() !== 'txt') {
      return { valid: false, error: { code: 'CORRUPTED_FILE', message: 'File too small' } };
    }

    const type = fileType.toLowerCase();

    switch (type) {
      case 'pdf': {
        // PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
        const magic = buffer.subarray(0, 4);
        if (magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46) {
          return { valid: true };
        }
        return { valid: false, error: { code: 'UNSUPPORTED_FORMAT', message: 'Invalid PDF file signature' } };
      }
      
      case 'docx': {
        // DOCX is a ZIP file with PK header (0x50, 0x4B)
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
          return { valid: true };
        }
        return { valid: false, error: { code: 'UNSUPPORTED_FORMAT', message: 'Invalid DOCX file signature' } };
      }
      
      case 'txt': {
        // Text files should not be binary files (check for null bytes in initial sample)
        const sampleLength = Math.min(buffer.length, 512);
        for (let i = 0; i < sampleLength; i++) {
          if (buffer[i] === 0x00) {
            return { valid: false, error: { code: 'UNSUPPORTED_FORMAT', message: 'Binary content detected in text file' } };
          }
        }
        return { valid: true };
      }
      
      default:
        return { valid: false, error: { code: 'UNSUPPORTED_FORMAT', message: `Unknown or unsupported file type: ${fileType}` } };
    }
  }
}

export const documentExtractionService = new DocumentExtractionService();