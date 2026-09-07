// Document Normalization Service
// Normalizes extracted text from resumes for consistent processing

import { ExtractedDocument } from './types';

export interface NormalizedDocument {
  text: string;
  sections: NormalizedSection[];
  metadata: NormalizedMetadata;
}

export interface NormalizedSection {
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'other';
  title?: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface NormalizedMetadata {
  originalLength: number;
  normalizedLength: number;
  sectionCount: number;
  warnings: string[];
}

export class DocumentNormalizationService {
  // Common resume section headers
  private static readonly SECTION_PATTERNS = {
    summary: [
      /^(summary|profile|objective|about|overview)\s*[:-]?\s*$/i,
      /^(professional\s+summary|career\s+summary|executive\s+summary)\s*[:-]?\s*$/i,
    ],
    experience: [
      /^(experience|employment|work\s+history|professional\s+experience|career)\s*[:-]?\s*$/i,
      /^(relevant\s+experience|work\s+experience)\s*[:-]?\s*$/i,
    ],
    education: [
      /^(education|academic|qualifications|degrees)\s*[:-]?\s*$/i,
      /^(academic\s+background|educational\s+background)\s*[:-]?\s*$/i,
    ],
    skills: [
      /^(skills|technical\s+skills|core\s+competencies|expertise|technologies|tools)\s*[:-]?\s*$/i,
      /^(programming\s+languages|frameworks|databases|cloud|devops)\s*[:-]?\s*$/i,
    ],
    projects: [
      /^(projects|personal\s+projects|key\s+projects|notable\s+projects|side\s+projects)\s*[:-]?\s*$/i,
      /^(portfolio|applications|systems)\s*[:-]?\s*$/i,
    ],
    certifications: [
      /^(certifications|certificates|licenses|credentials|accreditations)\s*[:-]?\s*$/i,
      /^(professional\s+certifications|technical\s+certifications)\s*[:-]?\s*$/i,
    ],
  };

  // Common patterns for dates
  private static readonly DATE_PATTERNS = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{4}\b/g,
    /\b\d{4}\s*[-–]\s*\d{4}\b/g,
    /\b(?:Present|Current|Now)\b/gi,
  ];

  // Company/organization indicators
  private static readonly COMPANY_INDICATORS = [
    'Inc', 'Inc.', 'LLC', 'Ltd', 'Ltd.', 'Corp', 'Corp.', 'Inc',
    'GmbH', 'AG', 'SA', 'NV', 'BV', 'Co', 'Co.', 'Company',
    'University', 'College', 'Institute', 'Institute of Technology',
    'School', 'Academy', 'Institute', 'Foundation', 'Association',
  ];

  normalize(document: ExtractedDocument): NormalizedDocument {
    const warnings: string[] = [];
    const text = document.text;

    // Clean the text
    const cleanedText = this.cleanText(text);
    
    // Detect sections
    const sections = this.detectSections(cleanedText);
    
    // Extract metadata
    const metadata = this.extractMetadata(text, sections);

    return {
      text: cleanedText,
      sections,
      metadata: {
        ...metadata,
        originalLength: document.text.length,
        normalizedLength: cleanedText.length,
        sectionCount: sections.length,
        warnings: [...(document.warnings || []), ...warnings],
      },
    };
  }

  private cleanText(text: string): string {
    let cleaned = text;

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Fix broken line wrapping (lines that end mid-sentence and continue on next line)
    cleaned = this.fixLineWrapping(cleaned);

    // Remove page numbers and headers/footers
    cleaned = this.removePageNumbers(cleaned);

    // Normalize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
    cleaned = cleaned.replace(/\n[ \t]+/g, '\n');

    // Trim
    return cleaned.trim();
  }

  private fixLineWrapping(text: string): string {
    // Join lines that appear to be wrapped mid-sentence
    // A line ending without punctuation followed by a lowercase word is likely wrapped
    const lines = text.split('\n');
    const fixed: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i].trimEnd();
      const nextLine = lines[i + 1]?.trimStart() || '';
      
      // Check if current line ends without punctuation and next line starts with lowercase
      const endsWithoutPunctuation = /[^.!?;:]\)]$/.test(currentLine);
      const nextStartsLowercase = /^[a-z]/.test(nextLine);
      const notEmpty = currentLine.length > 0 && nextLine.length > 0;
      
      if (endsWithoutPunctuation && nextStartsLowercase && notEmpty && i < lines.length - 1) {
        // Join with space
        fixed.push(currentLine + ' ' + nextLine);
        i++; // Skip next line
      } else {
        fixed.push(currentLine);
      }
    }
    
    return fixed.join('\n');
  }

  private removePageNumbers(text: string): string {
    // Remove standalone page numbers (lines with just numbers)
    const cleaned = text.replace(/^\s*\d+\s*$/gm, '');
    
    // Remove headers/footers that repeat
    // This is a simplified approach - in production, you'd want more sophisticated detection
    const lines = text.split('\n');
    const lineCounts = new Map<string, number>();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 100) {
        lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
      }
    }
    
    // Remove lines that appear more than 2 times and are likely headers/footers
    const toRemove = new Set<string>();
    for (const [line, count] of lineCounts) {
      if (count > 2) {
        toRemove.add(line);
      }
    }
    
    if (toRemove.size > 0) {
      const filteredLines = lines.filter(line => !toRemove.has(line.trim()));
      return filteredLines.join('\n');
    }
    
    return text;
  }

  private detectSections(text: string): NormalizedSection[] {
    const sections: NormalizedSection[] = [];
    const lines = text.split('\n');
    let currentSection: NormalizedSection | null = null;
    let charIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const sectionType = this.identifySection(line);
      
      if (sectionType && sectionType !== 'other') {
        // Close previous section
        if (currentSection) {
          currentSection.endIndex = charIndex;
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          type: sectionType,
          title: lines[i].trim(),
          content: '',
          startIndex: charIndex,
          endIndex: 0,
        };
      }
      
      // Add line content to current section
      if (currentSection) {
        currentSection.content += lines[i] + '\n';
      }
      
      charIndex += lines[i].length + 1; // +1 for newline
    }
    
    // Close final section
    if (currentSection) {
      currentSection.endIndex = charIndex;
      sections.push(currentSection);
    }
    
    // Clean up section content
    for (const section of sections) {
      section.content = section.content.trim();
    }
    
    // Filter out empty sections
    return sections.filter(s => s.content.length > 0);
  }

  private identifySection(line: string): NormalizedSection['type'] | null {
    const lowerLine = line.toLowerCase().trim();
    
    // Check each section type
    for (const [type, patterns] of Object.entries(DocumentNormalizationService.SECTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerLine)) {
          return type as NormalizedSection['type'];
        }
      }
      
      // Check for numbered/bulleted section headers
      if (/^\d+[.)]\s+[A-Z]/.test(line.trim())) {
        // Could be a numbered section, try to identify from content
      }
    }
    
    return null;
  }

  private extractMetadata(text: string, sections: NormalizedSection[]): NormalizedMetadata {
    const warnings: string[] = [];
    
    // Check for common issues
    if (text.length < 100) {
      warnings.push('Document appears to be very short');
    }
    
    if (!sections.some(s => s.type === 'experience')) {
      warnings.push('No experience section detected');
    }
    
    if (!sections.some(s => s.type === 'skills')) {
      warnings.push('No skills section detected');
    }
    
    if (!sections.some(s => s.type === 'education')) {
      warnings.push('No education section detected');
    }
    
    // Count date-like patterns
    const dateMatches = DocumentNormalizationService.DATE_PATTERNS.flatMap(pattern => text.match(pattern) || []);
    if (dateMatches.length < 2) {
      warnings.push('Few date references found - may affect experience parsing');
    }
    
    return {
      originalLength: 0, // Will be set by caller
      normalizedLength: 0, // Will be set by caller
      sectionCount: sections.length,
      warnings,
    };
  }
}

export const documentNormalizationService = new DocumentNormalizationService();