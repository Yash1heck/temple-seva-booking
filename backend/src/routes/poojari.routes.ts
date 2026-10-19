import { FastifyInstance } from 'fastify';
import { PoojariService } from '../modules/poojari/poojari.service.js';
import { requireRole } from '../middleware/auth.js';

export async function poojariRoutes(fastify: FastifyInstance) {
  // Poojari Dashboard (STRICTLY READ-ONLY)
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

    const todayDate = new Date().toISOString().split('T')[0];
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

