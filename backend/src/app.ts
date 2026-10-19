import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import { authRoutes } from './routes/auth.routes.js';
import { devoteeRoutes } from './routes/devotee.routes.js';
import { sevaRoutes } from './routes/seva.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import { poojariRoutes } from './routes/poojari.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { dailyClosureRoutes } from './routes/daily-closure.routes.js';
import { retentionRoutes } from './routes/retention.routes.js';
import { auditRoutes } from './routes/audit.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : {
      level: process.env.LOG_LEVEL || 'info',
      redact: ['req.headers.authorization', 'body.password']
    }
  });

  // CORS Configuration
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Rate Limiting (Protection against brute-force attempts)
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute'
  });

  // JWT Setup
  const jwtSecret = process.env.JWT_SECRET || 'temple-sringeri-secret-key-production-minded-v1';
  await app.register(jwt, {
    secret: jwtSecret
  });

  // Safe global error handler: No internal stack traces leaked to clients
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: error.message || 'Validation error'
      });
    }

    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'An internal temple service error occurred. Please contact the administrator.'
      });
    }

    return reply.status(statusCode).send({
      error: error.message || 'Request failed'
    });
  });

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    system: 'Temple Seva Booking System',
    timestamp: new Date().toISOString()
  }));

  // Register API modules
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(devoteeRoutes, { prefix: '/api/devotees' });
  await app.register(sevaRoutes, { prefix: '/api/sevas' });
  await app.register(bookingRoutes, { prefix: '/api/bookings' });
  await app.register(ticketRoutes, { prefix: '/api/tickets' });
  await app.register(poojariRoutes, { prefix: '/api/poojari' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(dailyClosureRoutes, { prefix: '/api/daily-closure' });
  await app.register(retentionRoutes, { prefix: '/api/retention' });
  await app.register(auditRoutes, { prefix: '/api/audit-logs' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });

  return app;
}

