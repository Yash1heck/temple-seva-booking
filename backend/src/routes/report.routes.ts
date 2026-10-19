import { FastifyInstance } from 'fastify';
import { ReportService } from '../modules/reports/report.service.js';
import { requireRole } from '../middleware/auth.js';

export async function reportRoutes(fastify: FastifyInstance) {
  // Report Summary (ADMIN ONLY)
  fastify.get('/summary', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const today = new Date().toISOString().split('T')[0];
    const startDate = query.startDate || today;
    const endDate = query.endDate || today;

    try {
      const report = await ReportService.generateReport(startDate, endDate);
      return report;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // CSV Export (ADMIN ONLY)
  fastify.get('/export/csv', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const today = new Date().toISOString().split('T')[0];
    const startDate = query.startDate || today;
    const endDate = query.endDate || today;

    try {
      const report = await ReportService.generateReport(startDate, endDate);
      const csv = ReportService.generateCsv(report);

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="temple-seva-report-${startDate}-to-${endDate}.csv"`);
      return reply.send(csv);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

