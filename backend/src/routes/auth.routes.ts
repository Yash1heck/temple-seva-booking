import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../modules/auth/auth.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Login Route
  fastify.post('/login', async (request, reply) => {
    const loginSchema = z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required')
    });

    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.errors[0].message });
    }

    const username = parseResult.data.username.trim();
    const password = parseResult.data.password.trim();
    const user = await AuthService.findByUsername(username);

    if (!user || !user.is_active) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const isValid = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };

    const token = fastify.jwt.sign(payload, { expiresIn: '12h' });

    return {
      token,
      user: payload
    };
  });

  // Current User Profile
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await AuthService.findById(request.user!.id);
    if (!user || !user.is_active) {
      return reply.status(401).send({ error: 'User account disabled or not found' });
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    };
  });

  // User Management (Admin Only)
  fastify.get('/users', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const roleQuery = (request.query as any)?.role;
    const users = await AuthService.listUsers(roleQuery);
    return users;
  });

  fastify.post('/users', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const createUserSchema = z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      name: z.string().min(2, 'Name is required'),
      role: z.enum(['admin', 'booking_staff', 'poojari']),
      password: z.string().min(6, 'Password must be at least 6 characters')
    });

    const parseResult = createUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.errors[0].message });
    }

    try {
      const newUser = await AuthService.createUser(parseResult.data);
      return reply.status(201).send(newUser);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  fastify.patch('/users/:id/status', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { is_active: boolean };

    if (params.id === request.user!.id) {
      return reply.status(400).send({ error: 'Cannot disable your own administrative account' });
    }

    try {
      const updated = await AuthService.updateUserStatus(params.id, body.is_active);
      return updated;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  // Admin resets or updates password for any staff/poojari/admin user
  fastify.patch('/users/:id/password', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { password?: string };

    if (!body.password || body.password.trim().length < 6) {
      return reply.status(400).send({ error: 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి (Password must be at least 6 characters)' });
    }

    try {
      await AuthService.updateUserPassword(params.id, body.password.trim());
      return { success: true, message: 'పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది' };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Authenticated user updates their own password
  fastify.post('/change-password', { preHandler: [requireRole(['admin', 'booking_staff', 'poojari'])] }, async (request, reply) => {
    const body = request.body as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({ error: 'ప్రస్తుత పాస్‌వర్డ్ మరియు నూతన పాస్‌వర్డ్ అవసరం' });
    }
    if (body.newPassword.trim().length < 6) {
      return reply.status(400).send({ error: 'నూతన పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' });
    }

    const user = await AuthService.findByUsername(request.user!.username);
    if (!user) {
      return reply.status(404).send({ error: 'వినియోగదారు కనుగొనబడలేదు' });
    }

    const isValid = await AuthService.verifyPassword(body.currentPassword, user.password_hash);
    if (!isValid) {
      return reply.status(400).send({ error: 'ప్రస్తుత పాస్‌వర్డ్ సరైనది కాదు' });
    }

    await AuthService.updateUserPassword(user.id, body.newPassword.trim());
    return { success: true, message: 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది' };
  });
}

