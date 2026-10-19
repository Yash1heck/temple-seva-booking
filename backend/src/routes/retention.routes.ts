import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RetentionService } from '../modules/retention/retention.service.js';
import { requireRole } from '../middleware/auth.js';

export async function retentionRoutes(fastify: FastifyInstance) {
  // Preview Eligible Devotee Profiles (ADMIN ONLY)
  fastify.get('/preview', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    try {
      const preview = await RetentionService.previewEligible();
      return preview;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Explicitly Execute Devotee Profile Retention Cleanup (ADMIN ONLY)
  fastify.post('/cleanup', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const schema = z.object({
      confirm: z.boolean().refine(val => val === true, {
        message: 'Explicit confirmation (confirm: true) is required to execute retention cleanup'
      }),
      notes: z.string().optional()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const result = await RetentionService.executeCleanup(
        request.user!.id,
        parsed.data.notes
      );
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Retention Run History (ADMIN ONLY)
  fastify.get('/history', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    try {
      const runs = await RetentionService.listRuns();
      return runs;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

