import { getTempleToday } from '../utils/date.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PoojariService } from '../modules/poojari/poojari.service.js';
import { requireRole } from '../middleware/auth.js';

export async function poojariRoutes(fastify: FastifyInstance) {
  // Mark Ticket as Completed (Poojari swipe / completion at sanctum)
  fastify.post('/complete-ticket', { preHandler: [requireRole(['poojari', 'admin'])] }, async (request, reply) => {
    const schema = z.object({
      ticket_number: z.string().min(1, 'Ticket number is required')
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const result = await PoojariService.markTicketCompleted(parsed.data.ticket_number, request.user!.id);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Poojari Dashboard (STRICTLY READ-ONLY for financial data)
  fastify.get('/dashboard', { preHandler: [requireRole(['poojari', 'admin'])] }, async (request, reply) => {
    const user = request.user!;
    const query = request.query as any;

    let targetPoojariId = user.id;

    // Security check: Poojari A cannot access Poojari B's records
    if (user.role === 'poojari') {
      if (query.poojariId && query.poojariId !== user.id) {
        return reply.status(403).send({ error: 'Unauthorized: You can only view your own assigned seva records.' });
      }
      targetPoojariId = user.id;
    } else if (user.role === 'admin' && query.poojariId) {
      targetPoojariId = query.poojariId;
    }

    const todayDate = getTempleToday();
    const targetDate = query.date || todayDate;
    const isBoard = query.board === 'true' || query.all === 'true';

    try {
      const assignedRituals = await PoojariService.getAssignedRituals(
        targetPoojariId,
        targetDate,
        query.sevaId,
        undefined,
        isBoard
      );
      return {
        date: targetDate,
        poojari_id: targetPoojariId,
        rituals: assignedRituals
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

