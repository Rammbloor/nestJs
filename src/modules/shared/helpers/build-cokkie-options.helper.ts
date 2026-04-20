import { AppConfigService } from '@infra/config/config.service';

export function buildCookieOptions(configService: AppConfigService) {
   return {
      isProduction: configService.isProduction,
      sameSite: configService.authCookieSameSite,
      domain: configService.authCookieDomain,
   };
}
