// Target Role API Routes
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware, optionalAuthMiddleware, type AuthVariables } from '../middleware/auth';
import { targetRoleService } from '../services/skill-intelligence/role-gap';

const roleRoutes = new Hono<{ Variables: AuthVariables }>();

const setTargetRoleSchema = z
  .object({
    roleId: z.string().min(1).optional(),
    targetRoleId: z.string().min(1).optional(),
  })
  .refine((data) => Boolean(data.roleId || data.targetRoleId), {
    message: 'roleId or targetRoleId is required',
  });

// GET /skill-intelligence/roles - List available target roles
roleRoutes.get('/roles', optionalAuthMiddleware, async (c) => {
  const roles = await targetRoleService.getTargetRoles();
  return c.json({ data: roles });
});

// GET /skill-intelligence/roles/:id - Get details for a target role
roleRoutes.get('/roles/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const role = await targetRoleService.getTargetRoleById(id);
  if (!role) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Target role not found' } }, 404);
  }
  return c.json({ data: role });
});

// GET /skill-intelligence/roles/:id/gap - Analyze authenticated user readiness against a target role
roleRoutes.get('/roles/:id/gap', authMiddleware, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const gap = await targetRoleService.calculateRoleGap(user.id, id);
  if (!gap) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Target role not found' } }, 404);
  }

  return c.json({ data: gap });
});

// GET /skill-intelligence/target-role - Get user's currently selected target role & gap
roleRoutes.get('/target-role', authMiddleware, async (c) => {
  const user = c.get('user');
  const targetRole = await targetRoleService.getUserTargetRole(user.id);

  if (!targetRole) {
    return c.json({ data: { targetRole: null, gap: null } });
  }

  const gap = await targetRoleService.calculateRoleGap(user.id, targetRole.id);
  return c.json({
    data: {
      targetRole,
      gap,
    },
  });
});

// POST /skill-intelligence/target-role - Set authenticated user's active target role
roleRoutes.post(
  '/target-role',
  authMiddleware,
  zValidator('json', setTargetRoleSchema),
  async (c) => {
    const user = c.get('user');
    const { roleId, targetRoleId } = c.req.valid('json');
    const selectedRoleId = (roleId || targetRoleId)!;

    try {
      const updatedRole = await targetRoleService.setUserTargetRole(user.id, selectedRoleId);
      const gap = await targetRoleService.calculateRoleGap(user.id, updatedRole.id);
      return c.json({ data: gap, role: updatedRole });
    } catch (e: any) {
      if (e.message === 'Target role not found') {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Target role not found' } }, 404);
      }
      return c.json(
        { error: { code: 'BAD_REQUEST', message: e.message || 'Could not update target role' } },
        400
      );
    }
  }
);

export default roleRoutes;
