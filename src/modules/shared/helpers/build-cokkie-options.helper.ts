import type { appConfig, authCookieConfig } from '@infra/config/config';
import type { ConfigType } from '@nestjs/config';

export function buildCookieOptions(
   app: ConfigType<typeof appConfig>,
   authCookie: ConfigType<typeof authCookieConfig>,
) {
   return {
      isProduction: app.isProduction,
      sameSite: authCookie.sameSite,
      domain: authCookie.domain,
   };
}
