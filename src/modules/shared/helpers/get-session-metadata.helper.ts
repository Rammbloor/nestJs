import type { Request } from 'express';

export function getSessionMetadata(request: Request) {
   return {
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
   };
}
