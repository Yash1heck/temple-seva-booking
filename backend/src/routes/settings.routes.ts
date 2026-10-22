import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { SettingsService } from '../modules/settings/settings.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { requireRole } from '../middleware/auth.js';
import { AuditService } from '../modules/audit/audit.service.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  // Public/Staff readable temple settings (branding, temple name, UPI info)
  fastify.get('/', async (_request, _reply) => {
    const settings = await SettingsService.getAll();
    // Mask sensitive security PIN hash before returning to client
    if (settings.payment_security_pin) {
      settings.payment_security_pin = {
        is_set: !!settings.payment_security_pin.pin_hash,
        updated_at: settings.payment_security_pin.updated_at
      };
    } else {
      settings.payment_security_pin = { is_set: false };
    }
    return settings;
  });

  // Verify Payment Security PIN before unfreezing payment standee QR
  fastify.post('/verify-payment-pin', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const { pin } = (request.body || {}) as { pin?: string };
    if (!pin || pin.trim().length === 0) {
      return reply.status(400).send({ error: 'సెక్యూరిటీ పిన్ నమోదు చేయండి (PIN is required)' });
    }

    const pinSetting = await SettingsService.getByKey('payment_security_pin');
    
    // Default initial PIN is '1008' if no custom PIN has been configured yet
    let isValid = false;
    if (!pinSetting || !pinSetting.pin_hash) {
      isValid = (pin.trim() === '1008');
    } else {
      isValid = await bcrypt.compare(pin.trim(), pinSetting.pin_hash);
    }

    if (!isValid) {
      return reply.status(401).send({ error: 'నమోదు చేసిన సెక్యూరిటీ పిన్ సరిపోలలేదు (Incorrect Security PIN)' });
    }

    await AuditService.log({
      actor_id: request.user!.id,
      action: 'PAYMENT_PIN_VERIFIED',
      entity_type: 'setting',
      entity_id: 'upi_config',
      details: { username: request.user!.username }
    });

    return { verified: true, message: 'సెక్యూరిటీ పిన్ విజయవంతంగా ధృవీకరించబడింది' };
  });

  // Change / Reset Payment Security PIN
  fastify.post('/change-payment-pin', { preHandler: [requireRole(['admin'])] }, async (request, reply) => {
    const { current_pin, new_pin, admin_password } = (request.body || {}) as {
      current_pin?: string;
      new_pin?: string;
      admin_password?: string;
    };

    if (!new_pin || new_pin.trim().length < 4) {
      return reply.status(400).send({ error: 'నూతన పిన్ కనీసం 4 అంకెలు ఉండాలి (New PIN must be at least 4 digits)' });
    }

    const pinSetting = await SettingsService.getByKey('payment_security_pin');

    // Authorization: Either verify current PIN, or Master Admin Password (for reset)
    let authorized = false;

    if (current_pin) {
      if (!pinSetting || !pinSetting.pin_hash) {
        authorized = (current_pin.trim() === '1008');
      } else {
        authorized = await bcrypt.compare(current_pin.trim(), pinSetting.pin_hash);
      }
      if (!authorized) {
        return reply.status(401).send({ error: 'ప్రస్తుత సెక్యూరిటీ పిన్ సరైనది కాదు (Incorrect current PIN)' });
      }
    } else if (admin_password) {
      const adminUser = await AuthService.findByUsername(request.user!.username);
      if (!adminUser) return reply.status(404).send({ error: 'యూజర్ లభించలేదు' });
      authorized = await AuthService.verifyPassword(admin_password, adminUser.password_hash);
      if (!authorized) {
        return reply.status(401).send({ error: 'అడ్మిన్ ఖాతా పాస్‌వర్డ్ సరైనది కాదు (Incorrect admin password)' });
      }
    } else {
      if (!pinSetting || !pinSetting.pin_hash) {
        authorized = true;
      } else {
        return reply.status(400).send({ error: 'దయచేసి ప్రస్తుత పిన్ లేదా అడ్మిన్ పాస్‌వర్డ్ నమోదు చేయండి' });
      }
    }

    const hashedPin = await bcrypt.hash(new_pin.trim(), 10);
    await SettingsService.updateKey('payment_security_pin', {
      pin_hash: hashedPin,
      updated_at: new Date().toISOString()
    });

    await AuditService.log({
      actor_id: request.user!.id,
      action: 'PAYMENT_PIN_CHANGED',
      entity_type: 'setting',
      entity_id: 'payment_security_pin',
      details: { username: request.user!.username }
    });

    return { success: true, message: 'సెక్యూరిటీ పిన్ విజయవంతంగా మార్చబడింది' };
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

