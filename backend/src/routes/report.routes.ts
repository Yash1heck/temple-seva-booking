import { getTempleToday } from '../utils/date.js';
import { FastifyInstance } from 'fastify';
import { ReportService } from '../modules/reports/report.service.js';
import { requireRole } from '../middleware/auth.js';

export async function reportRoutes(fastify: FastifyInstance) {
  // Report Summary (ADMIN ONLY)
  fastify.get('/summary', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const query = request.query as any;
    const today = getTempleToday();
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
    const today = getTempleToday();
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

  // Ritual Schedule for Target Date (All scheduled sevas + registered devotees, even if booked earlier)
  fastify.get('/ritual-schedule', { preHandler: [requireRole(['admin', 'booking_staff', 'poojari'])] }, async (request, reply) => {
    const query = request.query as any;
    const targetDate = query.date || getTempleToday();

    try {
      const { PoojariService } = await import('../modules/poojari/poojari.service.js');
      const rituals = await PoojariService.getAssignedRituals(undefined, targetDate, query.sevaId, undefined, true);
      const totalDevotees = rituals.reduce((sum, r) => sum + r.registration_count, 0);

      return {
        date: targetDate,
        total_sevas: rituals.length,
        total_devotees: totalDevotees,
        rituals
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}

