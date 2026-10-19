import { FastifyInstance } from 'fastify';
import { TicketService } from '../modules/tickets/ticket.service.js';
import { requireRole } from '../middleware/auth.js';

export async function ticketRoutes(fastify: FastifyInstance) {
  // Get Ticket by Ticket Number
  fastify.get('/number/:ticketNumber', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { ticketNumber: string };
    const ticket = await TicketService.findByNumber(params.ticketNumber);
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }
    return ticket;
  });

  // Get Ticket by ID
  fastify.get('/:id', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const ticket = await TicketService.findById(params.id);
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket not found' });
    }
    return ticket;
  });

  // Reprint Ticket (RULE 7: Does NOT create new booking, payment, or ticket number)
  fastify.post('/:id/reprint', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    try {
      const ticket = await TicketService.reprintTicket(params.id, request.user!.id);
      return ticket;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}

