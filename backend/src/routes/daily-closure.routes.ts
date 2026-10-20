import { getTempleToday } from '../utils/date.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DailyClosureService } from '../modules/daily-closure/daily-closure.service.js';
import { requireRole } from '../middleware/auth.js';

export async function dailyClosureRoutes(fastify: FastifyInstance) {
  // Get Daily Closure Status (ADMIN ONLY)
  fastify.get('/status', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const today = getTempleToday();
    const targetDate = query.date || today;

    try {
      const status = await DailyClosureService.getStatus(targetDate);
      return status;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Perform Daily Closure (ADMIN ONLY)
  fastify.post('/close', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const schema = z.object({
      date: z.string().min(10, 'Valid date (YYYY-MM-DD) is required'),
      notes: z.string().optional()
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const closure = await DailyClosureService.performClosure(
        parsed.data.date,
        request.user!.id,
        parsed.data.notes
      );
      return reply.status(201).send(closure);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // History of Closures (ADMIN ONLY)
  fastify.get('/history', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit, 10) : 30;
    const history = await DailyClosureService.listClosures(limit);
    return history;
  });
}

