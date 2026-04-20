import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
   InjectThrottlerOptions,
   InjectThrottlerStorage,
   ThrottlerGuard,
   type ThrottlerModuleOptions,
   type ThrottlerStorage,
} from '@nestjs/throttler';
import { REFRESH_TOKEN_COOKIE_NAME } from '@shared/constants';
import { getCookieValue } from '@shared/helpers';
import type { Request } from 'express';

export { AUTH_THROTTLE_RULES } from './throttler.config';

type AuthThrottleRequest = Request & {
   body?: Record<string, unknown>;
   ips?: string[];
};

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
   constructor(
      @InjectThrottlerOptions() options: ThrottlerModuleOptions,
      @InjectThrottlerStorage() storageService: ThrottlerStorage,
      reflector: Reflector,
   ) {
      super(options, storageService, reflector);
   }

   protected override getTracker(request: AuthThrottleRequest): Promise<string> {
      const path = this.getRequestPath(request);
      const clientIp = this.getClientIp(request);

      if (path.includes('/auth/refresh')) {
         const refreshToken = getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);
         return Promise.resolve(
            refreshToken ? `refresh:${this.hashValue(refreshToken)}` : `refresh-ip:${clientIp}`,
         );
      }

      if (path.includes('/auth/login')) {
         return Promise.resolve(`login-ip:${clientIp}`);
      }

      if (path.includes('/auth/register')) {
         return Promise.resolve(`register-ip:${clientIp}`);
      }

      return Promise.resolve(clientIp);
   }

   private getRequestPath(request: AuthThrottleRequest): string {
      return (request.originalUrl ?? request.url ?? '').split('?')[0];
   }

   private getClientIp(request: AuthThrottleRequest): string {
      return request.ips?.[0] ?? request.ip ?? 'unknown';
   }
   private hashValue(value: string): string {
      return createHash('sha256').update(value).digest('hex');
   }
}
