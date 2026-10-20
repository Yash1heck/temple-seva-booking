import { getTempleToday } from '../utils/date.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SevaService } from '../modules/sevas/seva.service.js';
import { requireRole } from '../middleware/auth.js';
import { AuditService } from '../modules/audit/audit.service.js';

export async function sevaRoutes(fastify: FastifyInstance) {
  // List Sevas for Booking / Dashboard
  fastify.get('/', { preHandler: [requireRole(['admin', 'booking_staff', 'poojari'])] }, async (request, reply) => {
    const user = request.user!;
    const query = request.query as any;

    if (user.role === 'poojari') {
      // Poojari should use poojari dashboard endpoint, but if calling list, restrict to their assigned sevas
      const targetDate = query.date || getTempleToday();
      return await SevaService.listAll({
        onlyActive: true,
        poojariId: user.id,
        targetDate
      });
    }

    // For Admin and Booking Staff:
    // If query says activeOnly=false and user is admin, show all (including inactive)
    const onlyActive = query.activeOnly !== 'false' || user.role !== 'admin';
    return await SevaService.listAll({ onlyActive });
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

