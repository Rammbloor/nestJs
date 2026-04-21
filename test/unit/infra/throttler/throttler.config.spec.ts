import { throttlerConfig } from '@infra/throttler';
import type { throttlerEnvConfig } from '@infra/config/config';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

function getResolvedOptions(): Exclude<ThrottlerModuleOptions, unknown[]> {
   const factory = throttlerConfig.useFactory;
   const options = factory?.({
      ttl: 1,
      limit: 10,
      authRules: {
         register: { ttl: 60_000, limit: 3 },
         login: { ttl: 60_000, limit: 5 },
         refresh: { ttl: 60_000, limit: 20 },
      },
   } as ConfigType<typeof throttlerEnvConfig>);

   return options as Exclude<ThrottlerModuleOptions, unknown[]>;
}

describe('throttlerConfig', () => {
   it('converts the configured throttler window to milliseconds and exposes auth-friendly defaults', () => {
      const options = getResolvedOptions();

      expect(options).toMatchObject({
         errorMessage: 'Слишком много попыток аутентификации. Попробуйте позже.',
         setHeaders: true,
         throttlers: [
            {
               ttl: 1000,
               limit: 10,
            },
         ],
      });
   });

   it('skips routes that do not opt into throttling metadata', () => {
      const options = getResolvedOptions();

      const handler = jest.fn();
      const classRef = jest.fn();
      const context = {
         getHandler: () => handler,
         getClass: () => classRef,
      } as unknown as ExecutionContext;

      expect(options.skipIf?.(context)).toBe(true);

      Reflect.defineMetadata('THROTTLER:LIMITdefault', 1, handler);

      expect(options.skipIf?.(context)).toBe(false);
   });
});
