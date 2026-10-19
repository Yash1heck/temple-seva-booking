import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUserPayload {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'booking_staff' | 'poojari';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUserPayload;
    user: AuthUserPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const queryToken = (request.query as any)?.token;
    
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      return reply.status(401).send({ error: 'Authentication required. No bearer token provided.' });
    }
    
    const decoded = await request.server.jwt.verify<AuthUserPayload>(token);
    request.user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid or expired session token.' });
  }
}

export function requireRole(allowedRoles: ('admin' | 'booking_staff' | 'poojari')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (!request.user) return;

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: `Access denied. Role '${request.user.role}' is not authorized to access this resource.`
      });
    }
  };
}

