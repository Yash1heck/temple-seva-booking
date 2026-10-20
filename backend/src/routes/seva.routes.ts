import { getTempleToday } from '../utils/date.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SevaService } from '../modules/sevas/seva.service.js';
import { requireRole } from '../middleware/auth.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { getDb } from '../db/index.js';
import { seedInitialData } from '../db/seed.js';

export async function sevaRoutes(fastify: FastifyInstance) {
  // Seed / Restore All Standard Sevas (Admin or auto-sync)
  fastify.post('/seed-defaults', { preHandler: [requireRole(['admin', 'booking_staff', 'poojari'])] }, async () => {
    const db = await getDb();
    await seedInitialData(db);
    const sevas = await SevaService.listAll({ onlyActive: true });
    return { success: true, count: sevas.length, sevas };
  });

  // List Sevas for Booking / Dashboard (Public for active sevas, role-aware for admin/poojari)
  fastify.get('/', async (request, reply) => {
    let user = request.user;
    if (!user) {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          user = await request.server.jwt.verify<any>(authHeader.substring(7));
          request.user = user;
        }
      } catch {
        // Unauthenticated devotee request
      }
    }

    const query = request.query as any;

    if (user && user.role === 'poojari') {
      // Poojari should use poojari dashboard endpoint, but if calling list, restrict to their assigned sevas
      const targetDate = query.date || getTempleToday();
      return await SevaService.listAll({
        onlyActive: true,
        poojariId: user.id,
        targetDate
      });
    }

    // For Devotees and Booking Staff: show active sevas. Only Admin with activeOnly=false sees inactive
    const onlyActive = query.activeOnly !== 'false' || user?.role !== 'admin';
    return await SevaService.listAll({ onlyActive });
  });

  // Dedicated Public Sevas Endpoint for Devotee Self-Service Portal
  fastify.get('/public', async () => {
    return await SevaService.listAll({ onlyActive: true });
  });

  // Get Single Seva Details
  fastify.get('/:id', { preHandler: [requireRole(['admin', 'booking_staff', 'poojari'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const seva = await SevaService.findById(params.id);
    if (!seva) return reply.status(404).send({ error: 'Seva not found' });
    return seva;
  });

  // Create Seva (ADMIN ONLY)
  fastify.post('/', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2, 'Name is required'),
      telugu_name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      price: z.number().min(0, 'Price must be non-negative'),
      is_active: z.boolean().optional(),
      is_scheduled: z.boolean().optional(),
      scheduled_date: z.string().optional().nullable(),
      timing: z.string().optional().nullable(),
      assigned_poojari_ids: z.array(z.string()).optional()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const created = await SevaService.create(parsed.data);
      await AuditService.log({
        actor_id: request.user!.id,
        action: 'SEVA_CREATED',
        entity_type: 'seva',
        entity_id: created.id,
        details: { name: created.name, price: created.price, is_scheduled: created.is_scheduled, scheduled_date: created.scheduled_date }
      });
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Update Seva (ADMIN ONLY)
  fastify.put('/:id', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      telugu_name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      category: z.string().optional(),
      price: z.number().min(0).optional(),
      is_active: z.boolean().optional(),
      is_scheduled: z.boolean().optional(),
      scheduled_date: z.string().optional().nullable(),
      timing: z.string().optional().nullable(),
      assigned_poojari_ids: z.array(z.string()).optional()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const previous = await SevaService.findById(params.id);
    if (!previous) return reply.status(404).send({ error: 'Seva not found' });

    try {
      const updated = await SevaService.update(params.id, parsed.data);
      await AuditService.log({
        actor_id: request.user!.id,
        action: 'SEVA_UPDATED',
        entity_type: 'seva',
        entity_id: params.id,
        details: {
          previous_price: previous.price,
          new_price: updated.price,
          changes: parsed.data
        }
      });
      return updated;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Toggle Seva Active Status (ADMIN ONLY)
  fastify.patch('/:id/status', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { is_active: boolean };

    try {
      const updated = await SevaService.setStatus(params.id, body.is_active);
      await AuditService.log({
        actor_id: request.user!.id,
        action: body.is_active ? 'SEVA_ACTIVATED' : 'SEVA_DEACTIVATED',
        entity_type: 'seva',
        entity_id: params.id,
        details: { is_active: body.is_active }
      });
      return updated;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}

