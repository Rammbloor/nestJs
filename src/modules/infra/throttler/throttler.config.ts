import { throttlerEnvConfig } from '@infra/config/config';
import { AppConfigModule } from '@infra/config/config.module';
import { type ExecutionContext } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
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
      limit: () => throttlerEnvConfig().authRules.register.limit,
      ttl: () => throttlerEnvConfig().authRules.register.ttl,
   },
   login: {
      limit: () => throttlerEnvConfig().authRules.login.limit,
      ttl: () => throttlerEnvConfig().authRules.login.ttl,
   },
   refresh: {
      limit: () => throttlerEnvConfig().authRules.refresh.limit,
      ttl: () => throttlerEnvConfig().authRules.refresh.ttl,
   },
} as const;

export const throttlerConfig: ThrottlerAsyncOptions = {
   imports: [AppConfigModule],
   inject: [throttlerEnvConfig.KEY],
   useFactory: (config: ConfigType<typeof throttlerEnvConfig>): ThrottlerModuleOptions => ({
      errorMessage: 'Слишком много попыток аутентификации. Попробуйте позже.',
      setHeaders: true,
      skipIf: (context: ExecutionContext) => !hasThrottleMetadata(context),
      throttlers: [
         {
            ttl: seconds(config.ttl),
            limit: config.limit,
         },
      ],
   }),
};
