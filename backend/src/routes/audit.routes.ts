import { FastifyInstance } from 'fastify';
import { AuditService } from '../modules/audit/audit.service.js';
import { requireRole } from '../middleware/auth.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const logs = await AuditService.listLogs({
      entity_type: query.entity_type,
      action: query.action,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0
    });
    return logs;
  });
}

