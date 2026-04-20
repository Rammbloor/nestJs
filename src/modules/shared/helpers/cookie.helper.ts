import { REFRESH_TOKEN_COOKIE_NAME } from '@shared/constants';
import type { CookieOptions, Request, Response } from 'express';

export function getCookieValue(request: Request, cookieName: string): string | undefined {
   const cookieHeader = request.headers.cookie;

   if (!cookieHeader) {
      return undefined;
   }

   for (const item of cookieHeader.split(';')) {
      const [rawName, ...rawValue] = item.trim().split('=');

      if (rawName === cookieName) {
         return decodeURIComponent(rawValue.join('='));
      }
   }

   return undefined;
}

export function buildRefreshTokenCookieOptions(
   options: {
      isProduction: boolean;
      sameSite: CookieOptions['sameSite'];
      domain?: string;
   },
   expiresAt: Date,
): CookieOptions {
   return {
      httpOnly: true,
      secure: options.isProduction,
      sameSite: options.sameSite,
      domain: options.domain,
      path: '/api/v1/auth',
      expires: expiresAt,
   };
}

export function setRefreshTokenCookie(
   response: Response,
   refreshToken: string,
   options: {
      isProduction: boolean;
      sameSite: CookieOptions['sameSite'];
      domain?: string;
   },
   expiresAt: Date,
): void {
   response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      buildRefreshTokenCookieOptions(options, expiresAt),
   );
}

export function clearRefreshTokenCookie(
   response: Response,
   options: {
      isProduction: boolean;
      sameSite: CookieOptions['sameSite'];
      domain?: string;
   },
): void {
   response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: options.isProduction,
      sameSite: options.sameSite,
      domain: options.domain,
      path: '/api/v1/auth',
   });
}
