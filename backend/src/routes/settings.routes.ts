import { FastifyInstance } from 'fastify';
import { SettingsService } from '../modules/settings/settings.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { requireRole } from '../middleware/auth.js';
import { AuditService } from '../modules/audit/audit.service.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Public/Staff readable temple settings (branding, temple name, UPI info)
  fastify.get('/', async (_request, _reply) => {
    const settings = await SettingsService.getAll();
    return settings;
  });

  // Verify Admin Password before unfreezing payment QR / sensitive settings
  fastify.post('/verify-admin-password', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const { password } = (request.body || {}) as { password?: string };
    if (!password) {
      return reply.status(400).send({ error: 'పాస్‌వర్డ్ నమోదు చేయండి (Password is required)' });
    }

    const adminUser = await AuthService.findByUsername(request.user!.username);
    if (!adminUser) {
      return reply.status(404).send({ error: 'యూజర్ వివరాలు లభించలేదు' });
    }

    const isValid = await AuthService.verifyPassword(password, adminUser.password_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'నమోదు చేసిన అడ్మిన్ పాస్‌వర్డ్ సరైనది కాదు (Incorrect admin password)' });
    }

    await AuditService.log({
      actor_id: request.user!.id,
      action: 'PAYMENT_QR_UNLOCK_VERIFIED',
      entity_type: 'setting',
      entity_id: 'upi_config',
      details: { username: request.user!.username }
    });

    return { verified: true, message: 'పాస్‌వర్డ్ విజయవంతంగా ధృవీకరించబడింది' };
  });

  // Get specific key
  fastify.get('/:key', async (request, reply) => {
    const params = request.params as { key: string };
    const value = await SettingsService.getByKey(params.key);
    if (!value) return reply.status(404).send({ error: 'Setting not found' });
    return value;
  });

  // Update setting (ADMIN ONLY)
  fastify.put('/:key', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const params = request.params as { key: string };
    const body = request.body;

    try {
      const updated = await SettingsService.updateKey(params.key, body);
      await AuditService.log({
        actor_id: request.user!.id,
        action: 'SETTING_UPDATED',
        entity_type: 'setting',
        entity_id: params.key,
        details: { key: params.key, new_value: body }
      });
      return updated;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}

