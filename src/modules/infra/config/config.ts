import { registerAs } from '@nestjs/config';
import { seconds } from '@nestjs/throttler';
import { AUTH_COOKIE_SAME_SITE_VALUES, EnvironmentConstant } from '@shared/constants';
import type { JwtExpiresIn } from '@shared/types';
import type { CookieOptions } from 'express';

export function parseIntegerEnv(name: string, defaultValue: number): number {
   const rawValue = process.env[name];
   const parsedValue = Number.parseInt(rawValue ?? String(defaultValue), 10);

   return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
}

function parseCorsOrigins(value: string | undefined): false | string[] {
   const origins = (value ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

   return origins.length === 0 ? false : origins;
}

export const appConfig = registerAs('app', () => {
   const env = process.env.NODE_ENV as EnvironmentConstant;

   return {
      env,
      isProduction: env === EnvironmentConstant.PRODUCTION,
      port: parseIntegerEnv('SERVER_PORT', 3000),
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
   };
});

export const authCookieConfig = registerAs('authCookie', () => ({
   domain: process.env.AUTH_COOKIE_DOMAIN,
   sameSite: (process.env.AUTH_COOKIE_SAME_SITE ??
      AUTH_COOKIE_SAME_SITE_VALUES[1]) as CookieOptions['sameSite'],
}));

export const databaseConfig = registerAs('database', () => ({
   host: process.env.POSTGRES_HOST as string,
   port: parseIntegerEnv('POSTGRES_PORT', 5432),
   user: process.env.POSTGRES_USER as string,
   password: process.env.POSTGRES_PASSWORD as string,
   name: process.env.POSTGRES_DB as string,
}));

export const jwtConfig = registerAs('jwt', () => ({
   accessTtl: (process.env.JWT_ACCESS_TTL ?? '2h') as JwtExpiresIn,
   accessSecretKey: process.env.JWT_ACCESS_SECRET_KEY as string,
   refreshTtl: (process.env.JWT_REFRESH_TTL ?? '7d') as JwtExpiresIn,
   refreshSecretKey: process.env.JWT_REFRESH_SECRET_KEY as string,
}));

export const swaggerConfig = registerAs('swagger', () => ({
   login: process.env.SWAGGER_LOGIN,
   password: process.env.SWAGGER_PASSWORD,
   swaggerPath: process.env.SWAGGER_PATH ?? '/docs',
   scalarPath: process.env.SCALAR_PATH ?? '/docs/scalar',
}));

export const throttlerEnvConfig = registerAs('throttler', () => ({
   ttl: parseIntegerEnv('THROTTLER_TTL', 1),
   limit: parseIntegerEnv('THROTTLER_LIMIT', 10),
   authRules: {
      register: {
         ttl: seconds(parseIntegerEnv('AUTH_REGISTER_THROTTLE_TTL', 60)),
         limit: parseIntegerEnv('AUTH_REGISTER_THROTTLE_LIMIT', 3),
      },
      login: {
         ttl: seconds(parseIntegerEnv('AUTH_LOGIN_THROTTLE_TTL', 60)),
         limit: parseIntegerEnv('AUTH_LOGIN_THROTTLE_LIMIT', 5),
      },
      refresh: {
         ttl: seconds(parseIntegerEnv('AUTH_REFRESH_THROTTLE_TTL', 60)),
         limit: parseIntegerEnv('AUTH_REFRESH_THROTTLE_LIMIT', 20),
      },
   },
}));
