import { createHash } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { AuthThrottlerGuard } from '@infra/throttler';

function hashValue(value: string): string {
   return createHash('sha256').update(value).digest('hex');
}

describe('AuthThrottlerGuard', () => {
   const guard = new AuthThrottlerGuard({} as never, {} as never, {} as Reflector);

   afterEach(() => {
      jest.clearAllMocks();
   });

   it('builds a login tracker from the client IP', async () => {
      const request = {
         originalUrl: '/api/v1/auth/login',
         ip: '203.0.113.10',
         body: {
            login: 'John.Doe',
         },
      };

      await expect((guard as unknown as { getTracker: (value: typeof request) => Promise<string> }).getTracker(request)).resolves.toBe(
         'login-ip:203.0.113.10',
      );
   });

   it('builds a register tracker from the client IP', async () => {
      const request = {
         originalUrl: '/api/v1/auth/register',
         ip: '203.0.113.11',
         body: {
            email: 'john@example.com',
            login: 'John',
         },
      };

      await expect((guard as unknown as { getTracker: (value: typeof request) => Promise<string> }).getTracker(request)).resolves.toBe(
         'register-ip:203.0.113.11',
      );
   });

   it('builds a refresh tracker from the refresh token cookie', async () => {
      const request = {
         originalUrl: '/api/v1/auth/refresh',
         ip: '203.0.113.12',
         headers: {
            cookie: `refreshToken=${encodeURIComponent('refresh-token-value')}`,
         },
      };

      await expect((guard as unknown as { getTracker: (value: typeof request) => Promise<string> }).getTracker(request)).resolves.toBe(
         `refresh:${hashValue('refresh-token-value')}`,
      );
   });

   it('falls back to the client IP when no auth identity is available', async () => {
      const request = {
         originalUrl: '/api/v1/auth/login',
         ip: '203.0.113.13',
      };

      await expect((guard as unknown as { getTracker: (value: typeof request) => Promise<string> }).getTracker(request)).resolves.toBe(
         'login-ip:203.0.113.13',
      );
   });
});
