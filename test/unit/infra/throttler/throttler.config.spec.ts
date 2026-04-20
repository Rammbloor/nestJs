import { throttlerConfig } from '@infra/throttler';
import type { ExecutionContext } from '@nestjs/common';
import type { AppConfigService } from '@infra/config/config.service';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

function getResolvedOptions(): Exclude<ThrottlerModuleOptions, unknown[]> {
   const factory = throttlerConfig.useFactory;
   const options = factory?.({
      throttlerTtl: 1,
      throttlerLimit: 10,
   } as AppConfigService);

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
