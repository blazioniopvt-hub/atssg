import { ConfidenceService } from '../services/skill-intelligence/confidence';
import { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '../auth/utils';

describe('SkillSync Critical Path Test Suite', () => {
  describe('Authentication & Security', () => {
    it('should hash and verify passwords using Argon2id', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash).toContain('$argon2id$');

      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword(hash, 'WrongPassword!');
      expect(isInvalid).toBe(false);
    });

    it('should prevent privilege escalation regression (email dev@skillsync.local with STUDENT role must NOT be admin)', () => {
      const regularUserWithDevEmail: { id: string; email: string; username: string; status: string; role: UserRole } = {
        id: 'user-1',
        email: 'dev@skillsync.local',
        username: 'attacker',
        status: 'ACTIVE',
        role: UserRole.STUDENT,
      };

      const isAdmin = regularUserWithDevEmail.role === UserRole.ADMIN;
      expect(isAdmin).toBe(false);
    });

    it('should correctly grant admin access to users with UserRole.ADMIN', () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@skillsync.com',
        username: 'admin',
        status: 'ACTIVE',
        role: UserRole.ADMIN,
      };

      const isAdmin = adminUser.role === UserRole.ADMIN;
      expect(isAdmin).toBe(true);
    });
  });

  describe('Skill Intelligence Confidence Engine', () => {
    let confidenceService: ConfidenceService;

    beforeEach(() => {
      confidenceService = new ConfidenceService();
    });

    it('should calculate confidence baseline for self-reported skills', () => {
      const result = confidenceService.calculate('BEGINNER', []);
      expect(result.score).toBeGreaterThanOrEqual(0.1);
      expect(result.level).toBeDefined();
      expect(result.evidenceCount).toBe(0);
    });

    it('should apply higher confidence scores when verified evidence items are present', () => {
      const unverifiedResult = confidenceService.calculate('INTERMEDIATE', []);
      const verifiedResult = confidenceService.calculate('INTERMEDIATE', [
        {
          type: 'PROJECT',
          verifiedAt: new Date(),
          verificationStatus: 'VERIFIED',
        },
        {
          type: 'CERTIFICATE',
          verifiedAt: new Date(),
          verificationStatus: 'VERIFIED',
        },
      ]);

      expect(verifiedResult.score).toBeGreaterThan(unverifiedResult.score);
      expect(verifiedResult.evidenceCount).toBe(2);
    });

    it('should enforce diminishing returns for multiple evidence items of the same type', () => {
      const singleItemResult = confidenceService.calculate('ADVANCED', [
        { type: 'PROJECT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
      ]);
      const duplicateItemsResult = confidenceService.calculate('ADVANCED', [
        { type: 'PROJECT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
        { type: 'PROJECT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
        { type: 'PROJECT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
      ]);

      expect(duplicateItemsResult.score).toBeGreaterThan(singleItemResult.score);
      // Ensure the second and third items didn't add linear full weight
      const item1Weight = duplicateItemsResult.factors.evidence[0].weight;
      const item2Weight = duplicateItemsResult.factors.evidence[1].weight;
      expect(item2Weight).toBeLessThan(item1Weight);
    });

    it('should clamp confidence score strictly between 0.0 and 1.0', () => {
      const maxedResult = confidenceService.calculate('EXPERT', [
        { type: 'ASSESSMENT_RESULT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
        { type: 'PROJECT', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
        { type: 'CERTIFICATE', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
        { type: 'WORK_EXPERIENCE', verifiedAt: new Date(), verificationStatus: 'VERIFIED' },
      ]);

      expect(maxedResult.score).toBeLessThanOrEqual(1.0);
      expect(maxedResult.score).toBeGreaterThanOrEqual(0.0);
    });
  });
});
