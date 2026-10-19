import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingService } from '../modules/bookings/booking.service.js';
import { requireRole } from '../middleware/auth.js';

export async function bookingRoutes(fastify: FastifyInstance) {
  // Create Booking
  fastify.post('/', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const itemSchema = z.object({
      seva_id: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
      ritual_beneficiary_name: z.string().optional(),
      gothra: z.string().optional()
    });

    const createSchema = z.object({
      devotee_id: z.string().uuid().optional().nullable(),
      payer_name: z.string().optional().nullable(),
      payer_mobile: z.string().optional().nullable(),
      ritual_beneficiary_name: z.string().min(1, 'Ritual beneficiary name is required'),
      gothra: z.string().min(1, 'Gothra is required'),
      family_details: z.string().optional().nullable(),
      items: z.array(itemSchema).min(1, 'At least one seva item must be included in the cart'),
      payment: z.object({
        method: z.enum(['cash', 'upi']),
        status: z.enum(['confirmed', 'pending']).optional(),
        transaction_reference: z.string().optional().nullable(),
        notes: z.string().optional().nullable()
      }),
      client_submitted_total: z.number().optional(),
      idempotency_key: z.string().optional()
    });

    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const result = await BookingService.createBooking({
        ...parsed.data,
        created_by_id: request.user!.id
      });
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // List Bookings
  fastify.get('/', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const query = request.query as any;
    const bookings = await BookingService.listBookings({
      startDate: query.startDate,
      endDate: query.endDate,
      bookingDate: query.bookingDate,
      scheduledDate: query.scheduledDate,
      futureOnly: query.futureOnly === 'true',
      search: query.search,
      status: query.status,
      paymentStatus: query.paymentStatus,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0
    });
    return bookings;
  });

  // Get Booking Details by ID
  fastify.get('/:id', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    try {
      const details = await BookingService.getBookingDetails(params.id);
      return details;
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });

  // Cancel Booking (ADMIN ONLY)
  fastify.post('/:id/cancel', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const schema = z.object({
      reason: z.string().min(3, 'A valid cancellation reason is required')
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    try {
      const cancelled = await BookingService.cancelBooking(params.id, request.user!.id, parsed.data.reason);
      return cancelled;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}

