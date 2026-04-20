import { AppConfigModule } from '@infra/config/config.module';
import { AppConfigService } from '@infra/config/config.service';
import { type ExecutionContext } from '@nestjs/common';
import {
   seconds,
   type ThrottlerAsyncOptions,
   type ThrottlerModuleOptions,
} from '@nestjs/throttler';

const THROTTLER_LIMIT_METADATA = 'THROTTLER:LIMITdefault';

function hasThrottleMetadata(context: ExecutionContext): boolean {
   const handler = context.getHandler();
   const classRef = context.getClass();

   return Boolean(
      Reflect.getMetadata(THROTTLER_LIMIT_METADATA, handler) ??
         Reflect.getMetadata(THROTTLER_LIMIT_METADATA, classRef),
   );
}

export const AUTH_THROTTLE_RULES = {
   register: {
      limit: 3,
      ttl: seconds(60),
   },
   login: {
      limit: 5,
      ttl: seconds(60),
   },
   refresh: {
      limit: 20,
      ttl: seconds(60),
   },
} as const;

export const throttlerConfig: ThrottlerAsyncOptions = {
   imports: [AppConfigModule],
   inject: [AppConfigService],
   useFactory: (configService: AppConfigService): ThrottlerModuleOptions => ({
      errorMessage: 'Слишком много попыток аутентификации. Попробуйте позже.',
      setHeaders: true,
      skipIf: (context: ExecutionContext) => !hasThrottleMetadata(context),
      throttlers: [
         {
            ttl: seconds(configService.throttlerTtl),
            limit: configService.throttlerLimit,
         },
      ],
   }),
};
