import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DevoteeRequestService } from '../modules/devotee-requests/devotee-request.service.js';
import { requireRole } from '../middleware/auth.js';
import { sanitizeText, validateDevoteeName, validateGothram, validateMobile } from '../utils/security.js';

export async function devoteeRequestRoutes(fastify: FastifyInstance) {
  // Public Endpoint: Submit Devotee Self-Service Seva Request
  fastify.post('/', async (request, reply) => {
    const itemSchema = z.object({
      seva_id: z.string().uuid(),
      seva_name: z.string().min(1),
      seva_price: z.number().nonnegative(),
      quantity: z.number().int().min(1).default(1),
      scheduled_date: z.string().optional().nullable()
    });

    const bodySchema = z.object({
      devotee_name: z.string().min(1, 'సంకల్ప కర్త పేరు తప్పనిసరి'),
      gothra: z.string().min(1, 'గోత్రము తప్పనిసరి'),
      family_details: z.string().optional().nullable(),
      mobile: z.string().min(10, 'సరైన మొబైల్ సంఖ్యను నమోదు చేయండి'),
      items: z.array(itemSchema).min(1, 'కనీసం ఒక సేవను ఎంచుకోవాలి')
    });

    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const nameCheck = validateDevoteeName(parsed.data.devotee_name);
    if (!nameCheck.valid) {
      return reply.status(400).send({ error: nameCheck.error });
    }

    const gothraCheck = validateGothram(parsed.data.gothra);
    if (!gothraCheck.valid) {
      return reply.status(400).send({ error: gothraCheck.error });
    }

    const mobileCheck = validateMobile(parsed.data.mobile);
    if (!mobileCheck.valid) {
      return reply.status(400).send({ error: mobileCheck.error });
    }

    try {
      const sanitizedPayload = {
        devotee_name: sanitizeText(parsed.data.devotee_name),
        gothra: sanitizeText(parsed.data.gothra),
        family_details: parsed.data.family_details ? sanitizeText(parsed.data.family_details).slice(0, 250) : null,
        mobile: parsed.data.mobile.trim(),
        items: parsed.data.items
      };

      const result = await DevoteeRequestService.createRequest(sanitizedPayload);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Staff Endpoint: List Pending Devotee Requests
  fastify.get('/pending', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const query = request.query as any;
    try {
      const list = await DevoteeRequestService.listPendingRequests(query.mobile);
      return list;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Staff Endpoint: Mark Devotee Request Approved
  fastify.patch('/:id/approve', { preHandler: [requireRole(['admin', 'booking_staff'])] }, async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { booking_id: string };

    if (!body?.booking_id) {
      return reply.status(400).send({ error: 'booking_id is required' });
    }

    try {
      const result = await DevoteeRequestService.approveRequest(params.id, body.booking_id);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
