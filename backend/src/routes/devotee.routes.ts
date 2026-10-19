import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DevoteeService } from '../modules/devotees/devotee.service.js';
import { requireRole } from '../middleware/auth.js';

export async function devoteeRoutes(fastify: FastifyInstance) {
  // Devotee Search (Counter Staff and Admin)
  fastify.get('/search', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const q = (request.query as any)?.q || '';
    const results = await DevoteeService.search(q);
    return results;
  });

  // Get Devotee by ID
  fastify.get('/:id', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const devotee = await DevoteeService.findById(params.id);
    if (!devotee) {
      return reply.status(404).send({ error: 'Devotee not found' });
    }
    return devotee;
  });

  // Create Devotee
  fastify.post('/', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const schema = z.object({
      mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
      name: z.string().min(2, 'Name is required'),
      gothra: z.string().min(2, 'Gothra is required'),
      family_details: z.string().optional().nullable()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const created = await DevoteeService.create(parsed.data);
    return reply.status(201).send(created);
  });

  // Update Reusable Devotee Profile
  fastify.put('/:id', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      mobile: z.string().min(10).optional(),
      gothra: z.string().min(2).optional(),
      family_details: z.string().optional().nullable()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const updated = await DevoteeService.update(params.id, parsed.data);
      return updated;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}

