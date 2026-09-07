import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth';
import { createStorageProviderFromEnv } from '../../services/storage';
import { documentExtractionService } from '../../services/document';
import { documentNormalizationService } from '../../services/document';
import { resumeAnalysisService } from '../../services/resume/analysis';
import prismaClient from '../../lib/prisma';

const resumeUploadRoutes = new Hono<{ Variables: AuthVariables }>();

// Validation schemas
const uploadResumeSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.enum(['PDF', 'DOCX', 'TXT']),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().optional(),
});

// POST /resumes/upload - Upload resume file
const uploadRoutes = new Hono<{ Variables: AuthVariables }>();

uploadRoutes.post(
  '/',
  authMiddleware,
  async (c) => {
    const user = c.get('user');
    const body = await c.req.parseBody();
    
    const file = body['file'] as File;
    const resumeId = body['resumeId'] as string | undefined;

    if (!file) {
      return c.json({ error: { code: 'NO_FILE', message: 'No file provided' } }, 400);
    }

    // Validate file extension
    const originalName = file.name || 'resume.txt';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['pdf', 'docx', 'txt'];
    if (!allowedExtensions.includes(extension)) {
      return c.json({ error: { code: 'INVALID_FILE_EXTENSION', message: 'Unsupported file extension. Allowed: .pdf, .docx, .txt' } }, 400);
    }

    // Validate MIME type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/octet-stream', // fallback from some clients
    ];
    if (file.type && !allowedTypes.includes(file.type)) {
      return c.json({ error: { code: 'INVALID_FILE_TYPE', message: 'Unsupported MIME type. Supported: PDF, DOCX, TXT' } }, 400);
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' } }, 400);
    }

    if (file.size === 0) {
      return c.json({ error: { code: 'EMPTY_FILE', message: 'Uploaded file is empty' } }, 400);
    }

    try {
      // Convert file to buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Determine file type from extension or MIME type
      let fileType: 'PDF' | 'DOCX' | 'TXT' = 'TXT';
      if (extension === 'pdf' || file.type === 'application/pdf') {
        fileType = 'PDF';
      } else if (extension === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        fileType = 'DOCX';
      } else {
        fileType = 'TXT';
      }

      // Validate magic bytes to prevent MIME/extension spoofing
      const magicValidation = documentExtractionService.validateMagicBytes(fileBuffer, fileType.toLowerCase());
      if (!magicValidation.valid) {
        return c.json({
          error: {
            code: 'INVALID_FILE_SIGNATURE',
            message: magicValidation.error?.message || 'File content does not match the specified format',
          },
        }, 400);
      }

      // Sanitize filename against directory traversal and control characters
      const sanitizedFilename = originalName
        .replace(/[/\\]/g, '_')
        .replace(/\0/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .slice(0, 120);

      const storageKey = `resumes/${user.id}/${Date.now()}-${sanitizedFilename}`;

      // Get or create resume record
      let resume;
      if (body.resumeId) {
        // Use existing resume record with strict ownership check
        const existingResume = await prismaClient.resume.findFirst({
          where: { id: body.resumeId as string, userId: user.id },
        });
        if (!existingResume) {
          return c.json({ error: { code: 'NOT_FOUND', message: 'Resume not found' } }, 404);
        }
        resume = existingResume;
        
        // Update the existing record
        await prismaClient.resume.update({
          where: { id: body.resumeId as string },
          data: {
            originalFilename: sanitizedFilename,
            storageKey,
            fileType,
            fileSize: file.size,
            mimeType: file.type || (fileType === 'PDF' ? 'application/pdf' : fileType === 'DOCX' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain'),
            status: 'UPLOADED',
          },
        });
      } else {
        // Create new resume record
        const resumeRecord = await prismaClient.resume.create({
          data: {
            userId: user.id,
            originalFilename: sanitizedFilename,
            storageKey,
            fileType,
            fileSize: file.size,
            mimeType: file.type || (fileType === 'PDF' ? 'application/pdf' : fileType === 'DOCX' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain'),
            status: 'UPLOADED',
          },
        });
        resume = resumeRecord;
      }

      // Upload file to storage abstraction
      const storage = createStorageProviderFromEnv();
      await storage.upload({
        key: resume.storageKey,
        content: fileBuffer,
        contentType: resume.mimeType || 'application/octet-stream',
      });

      // Update resume status to READY
      await prismaClient.resume.update({
        where: { id: resume.id },
        data: { status: 'READY' },
      });

      return c.json({ data: { resumeId: resume.id, storageKey: resume.storageKey, status: 'READY' } }, 201);
    } catch (error) {
      console.error('Upload error:', error);
      return c.json({ error: { code: 'UPLOAD_FAILED', message: 'Failed to upload resume' } }, 500);
    }
  });

export default uploadRoutes;