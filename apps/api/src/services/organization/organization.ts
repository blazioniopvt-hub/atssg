import crypto from 'crypto';
import prismaClient from '../../lib/prisma';
import {
  OrgUserRole,
  InvitationStatus,
  OrganizationType,
  type OrganizationInvitationDTO,
  type OrganizationDepartmentDTO,
  type OrganizationProgramDTO,
  type OrganizationCohortDTO,
  type OrganizationMemberDTO,
  type CreateOrganizationInput,
} from '@skillsync/types';

// In-memory fallback stores for testing & disconnected environments
export const inMemoryOrganizations = new Map<string, any>();
export const inMemoryUserOrganizations = new Map<string, any>(); // key: `${userId}:${orgId}`
export const inMemoryInvitations = new Map<string, any>(); // key: token or id
export const inMemoryDepartments = new Map<string, any>();
export const inMemoryPrograms = new Map<string, any>();
export const inMemoryCohorts = new Map<string, any>();

export class OrganizationService {
  /**
   * Creates a new organization and assigns the creator as OWNER
   */
  async createOrganization(userId: string, input: CreateOrganizationInput) {
    const orgData = {
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      type: input.type || OrganizationType.EDUCATIONAL,
      websiteUrl: input.websiteUrl || null,
      industry: input.industry || null,
    };

    try {
      const org = await prismaClient.organization.create({
        data: orgData,
      });

      // Assign creator as OWNER
      await prismaClient.userOrganization.create({
        data: {
          userId,
          organizationId: org.id,
          role: OrgUserRole.OWNER,
        },
      });

      // Default settings
      await prismaClient.organizationSettings.create({
        data: {
          organizationId: org.id,
          requireVerification: false,
          allowStudentSelfEnroll: true,
        },
      });

      return org;
    } catch {
      // Memory fallback
      const orgId = `org_${Date.now()}`;
      const org = {
        id: orgId,
        ...orgData,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryOrganizations.set(orgId, org);
      inMemoryOrganizations.set(org.slug, org);

      const membershipId = `uorg_${Date.now()}`;
      inMemoryUserOrganizations.set(`${userId}:${orgId}`, {
        id: membershipId,
        userId,
        organizationId: orgId,
        role: OrgUserRole.OWNER,
        joinedAt: new Date(),
      });

      return org;
    }
  }

  /**
   * Retrieves an organization by ID or slug with role check
   */
  async getOrganization(orgIdOrSlug: string, userId?: string) {
    try {
      const org = await prismaClient.organization.findFirst({
        where: {
          OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
        },
        include: {
          departments: true,
          cohorts: true,
          settings: true,
          _count: {
            select: { members: true, opportunities: true },
          },
        },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      let userRole: OrgUserRole | null = null;
      if (userId) {
        const membership = await prismaClient.userOrganization.findUnique({
          where: {
            userId_organizationId: {
              userId,
              organizationId: org.id,
            },
          },
        });
        userRole = membership?.role as OrgUserRole || null;
      }

      return {
        ...org,
        userRole,
      };
    } catch (err: any) {
      if (err.message === 'Organization not found') throw err;

      // Memory fallback
      const org = inMemoryOrganizations.get(orgIdOrSlug);
      if (!org) throw new Error('Organization not found');

      const membership = userId ? inMemoryUserOrganizations.get(`${userId}:${org.id}`) : null;
      return {
        ...org,
        departments: Array.from(inMemoryDepartments.values()).filter(d => d.organizationId === org.id),
        cohorts: Array.from(inMemoryCohorts.values()).filter(c => c.organizationId === org.id),
        userRole: membership?.role || null,
        _count: { members: 1, opportunities: 0 },
      };
    }
  }

  /**
   * Lists all organizations where a user is an active member
   */
  async listUserOrganizations(userId: string) {
    try {
      const memberships = await prismaClient.userOrganization.findMany({
        where: { userId },
        include: {
          organization: {
            include: {
              _count: {
                select: { members: true },
              },
            },
          },
          department: true,
          cohort: true,
        },
      });

      return memberships.map((m: any) => ({
        ...m.organization,
        role: m.role,
        joinedAt: m.joinedAt,
        department: m.department,
        cohort: m.cohort,
      }));
    } catch {
      // Memory fallback
      const results: any[] = [];
      for (const [key, membership] of inMemoryUserOrganizations.entries()) {
        if (membership.userId === userId) {
          const org = inMemoryOrganizations.get(membership.organizationId);
          if (org) {
            results.push({
              ...org,
              role: membership.role,
              joinedAt: membership.joinedAt,
            });
          }
        }
      }
      return results;
    }
  }

  /**
   * Verifies user has at least one of the required roles in the organization
   */
  async verifyRole(userId: string, organizationId: string, allowedRoles: OrgUserRole[]): Promise<OrgUserRole> {
    let role: OrgUserRole | null = null;
    try {
      const membership = await prismaClient.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });
      role = membership?.role as OrgUserRole || null;
    } catch {
      const membership = inMemoryUserOrganizations.get(`${userId}:${organizationId}`);
      role = membership?.role as OrgUserRole || null;
    }

    if (!role) {
      throw new Error('Access denied: not a member of this organization');
    }

    // Role hierarchy mapping
    const isOwner = role === OrgUserRole.OWNER;
    const isAdmin = role === OrgUserRole.ADMIN || role === OrgUserRole.ORG_ADMIN;

    if (isOwner) return role;
    if (isAdmin && !allowedRoles.includes(OrgUserRole.OWNER)) return role;

    if (!allowedRoles.includes(role)) {
      throw new Error(`Access denied: required role ${allowedRoles.join(' or ')}, found ${role}`);
    }

    return role;
  }

  /**
   * Invites a new user to the organization by email
   */
  async createInvitation(
    organizationId: string,
    invitedById: string,
    email: string,
    role: OrgUserRole = OrgUserRole.CANDIDATE
  ): Promise<OrganizationInvitationDTO> {
    await this.verifyRole(invitedById, organizationId, [
      OrgUserRole.OWNER,
      OrgUserRole.ADMIN,
      OrgUserRole.CAREER_ADMIN,
    ]);

    const normalizedEmail = email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      const invitation = await prismaClient.organizationInvitation.create({
        data: {
          organizationId,
          email: normalizedEmail,
          role,
          token,
          status: InvitationStatus.PENDING,
          invitedById,
          expiresAt,
        },
        include: {
          organization: { select: { name: true } },
        },
      });

      return {
        id: invitation.id,
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        invitedById: invitation.invitedById,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    } catch {
      // Memory fallback
      const invitationId = `inv_${Date.now()}`;
      const invitation: OrganizationInvitationDTO = {
        id: invitationId,
        organizationId,
        email: normalizedEmail,
        role,
        token,
        status: InvitationStatus.PENDING,
        invitedById,
        expiresAt,
        createdAt: new Date(),
      };
      inMemoryInvitations.set(token, invitation);
      inMemoryInvitations.set(invitationId, invitation);
      return invitation;
    }
  }

  /**
   * Accepts an organization invitation via token
   */
  async acceptInvitation(token: string, userId: string) {
    let invitation: any = null;
    try {
      invitation = await prismaClient.organizationInvitation.findUnique({
        where: { token },
      });
    } catch {
      invitation = inMemoryInvitations.get(token);
    }

    if (!invitation) {
      throw new Error('Invalid or expired invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    try {
      // Add or update member
      const member = await prismaClient.userOrganization.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
        update: {
          role: invitation.role,
        },
        create: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Mark invitation accepted
      await prismaClient.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      return member;
    } catch {
      // Memory fallback
      inMemoryUserOrganizations.set(`${userId}:${invitation.organizationId}`, {
        id: `uorg_${Date.now()}`,
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        joinedAt: new Date(),
      });
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      return { userId, organizationId: invitation.organizationId, role: invitation.role };
    }
  }

  /**
   * Lists organization members with department/cohort/role details
   */
  async getMembers(organizationId: string, requestingUserId: string): Promise<OrganizationMemberDTO[]> {
    await this.verifyRole(requestingUserId, organizationId, [
      OrgUserRole.OWNER,
      OrgUserRole.ADMIN,
      OrgUserRole.CAREER_ADMIN,
      OrgUserRole.FACULTY,
      OrgUserRole.MENTOR,
      OrgUserRole.RECRUITER,
      OrgUserRole.CANDIDATE,
      OrgUserRole.MEMBER,
    ]);

    try {
      const members = await prismaClient.userOrganization.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          department: true,
          program: true,
          cohort: true,
        },
      });

      return members.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role,
        user: m.user,
        department: m.department,
        program: m.program,
        cohort: m.cohort,
        joinedAt: m.joinedAt,
      }));
    } catch {
      // Memory fallback
      const results: OrganizationMemberDTO[] = [];
      for (const m of inMemoryUserOrganizations.values()) {
        if (m.organizationId === organizationId) {
          results.push({
            id: m.id,
            userId: m.userId,
            organizationId: m.organizationId,
            role: m.role,
            user: {
              id: m.userId,
              email: `${m.userId}@example.com`,
              username: m.userId,
              profile: { firstName: 'Test', lastName: 'Student' },
            },
            joinedAt: m.joinedAt || new Date(),
          });
        }
      }
      return results;
    }
  }

  /**
   * Creates an academic department
   */
  async createDepartment(
    organizationId: string,
    userId: string,
    data: { name: string; code: string; description?: string }
  ): Promise<OrganizationDepartmentDTO> {
    await this.verifyRole(userId, organizationId, [OrgUserRole.OWNER, OrgUserRole.ADMIN]);

    try {
      const dept = await prismaClient.organizationDepartment.create({
        data: {
          organizationId,
          name: data.name,
          code: data.code.toUpperCase(),
          description: data.description || null,
        },
      });
      return dept;
    } catch {
      const deptId = `dept_${Date.now()}`;
      const dept: OrganizationDepartmentDTO = {
        id: deptId,
        organizationId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        createdAt: new Date(),
      };
      inMemoryDepartments.set(deptId, dept);
      return dept;
    }
  }

  /**
   * Lists departments for an organization
   */
  async listDepartments(organizationId: string, userId: string): Promise<OrganizationDepartmentDTO[]> {
    await this.verifyRole(userId, organizationId, [
      OrgUserRole.OWNER,
      OrgUserRole.ADMIN,
      OrgUserRole.CAREER_ADMIN,
      OrgUserRole.FACULTY,
      OrgUserRole.CANDIDATE,
      OrgUserRole.MEMBER,
    ]);

    try {
      const depts = await prismaClient.organizationDepartment.findMany({
        where: { organizationId },
        include: {
          _count: {
            select: { programs: true, members: true },
          },
        },
      });
      return depts.map((d: any) => ({
        ...d,
        programsCount: d._count.programs,
        membersCount: d._count.members,
      }));
    } catch {
      return Array.from(inMemoryDepartments.values()).filter((d: any) => d.organizationId === organizationId);
    }
  }

  /**
   * Creates an academic or training cohort
   */
  async createCohort(
    organizationId: string,
    userId: string,
    data: { name: string; programId?: string; graduationYear?: number; startDate?: string; endDate?: string }
  ): Promise<OrganizationCohortDTO> {
    await this.verifyRole(userId, organizationId, [
      OrgUserRole.OWNER,
      OrgUserRole.ADMIN,
      OrgUserRole.CAREER_ADMIN,
    ]);

    try {
      const cohort = await prismaClient.organizationCohort.create({
        data: {
          organizationId,
          programId: data.programId || null,
          name: data.name,
          graduationYear: data.graduationYear || null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      });
      return cohort;
    } catch {
      const cohortId = `coh_${Date.now()}`;
      const cohort: OrganizationCohortDTO = {
        id: cohortId,
        organizationId,
        programId: data.programId,
        name: data.name,
        graduationYear: data.graduationYear,
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: new Date(),
      };
      inMemoryCohorts.set(cohortId, cohort);
      return cohort;
    }
  }

  /**
   * Lists cohorts for an organization
   */
  async listCohorts(organizationId: string, userId: string): Promise<OrganizationCohortDTO[]> {
    await this.verifyRole(userId, organizationId, [
      OrgUserRole.OWNER,
      OrgUserRole.ADMIN,
      OrgUserRole.CAREER_ADMIN,
      OrgUserRole.FACULTY,
      OrgUserRole.CANDIDATE,
      OrgUserRole.MEMBER,
    ]);

    try {
      const cohorts = await prismaClient.organizationCohort.findMany({
        where: { organizationId },
        include: {
          program: { select: { name: true } },
          _count: { select: { members: true } },
        },
      });
      return cohorts.map((c: any) => ({
        ...c,
        programName: c.program?.name,
        membersCount: c._count.members,
      }));
    } catch {
      return Array.from(inMemoryCohorts.values()).filter((c: any) => c.organizationId === organizationId);
    }
  }
}

export const organizationService = new OrganizationService();
