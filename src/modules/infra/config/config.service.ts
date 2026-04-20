import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentConstant } from '@shared/constants';
import { EnvironmentVariables } from '@shared/helpers';
import { JwtExpiresIn } from '@shared/types';
import type { CookieOptions } from 'express';

@Injectable()
export class AppConfigService extends ConfigService<EnvironmentVariables, true> {
   get serverPort(): number {
      return this.getOrThrow('SERVER_PORT');
   }
   get appEnv(): EnvironmentConstant {
      return this.getOrThrow('NODE_ENV');
   }
   get isProduction(): boolean {
      return this.appEnv === EnvironmentConstant.PRODUCTION;
   }
   get dbHost(): string {
      return this.getOrThrow('POSTGRES_HOST');
   }
   get dbPort(): number {
      return this.getOrThrow('POSTGRES_PORT');
   }
   get dbUser(): string {
      return this.getOrThrow('POSTGRES_USER');
   }
   get dbPassword(): string {
      return this.getOrThrow('POSTGRES_PASSWORD');
   }
   get dbName(): string {
      return this.getOrThrow('POSTGRES_DB');
   }

   get swaggerDocLogin(): string {
      return this.getOrThrow('SWAGGER_LOGIN');
   }
   get swaggerDocPassword(): string {
      return this.getOrThrow('SWAGGER_PASSWORD');
   }
   get swaggerDocPath(): string {
      return this.getOrThrow('SWAGGER_PATH');
   }
   get scalarDocPath(): string {
      return this.getOrThrow('SCALAR_PATH');
   }

   get throttlerTtl(): number {
      return this.getOrThrow('THROTTLER_TTL');
   }
   get throttlerLimit(): number {
      return this.getOrThrow('THROTTLER_LIMIT');
   }
   get corsOrigins(): false | string[] {
      const origins = this.getOrThrow('CORS_ORIGINS')
         .split(',')
         .map((origin) => origin.trim())
         .filter(Boolean);

      return origins.length === 0 ? false : origins;
   }
   get jwtAccessTtl(): JwtExpiresIn {
      return this.getOrThrow<JwtExpiresIn>('JWT_ACCESS_TTL');
   }
   get jwtAccessSecretKey(): string {
      return this.getOrThrow<string>('JWT_ACCESS_SECRET_KEY');
   }
   get jwtRefreshTtl(): JwtExpiresIn {
      return this.getOrThrow<JwtExpiresIn>('JWT_REFRESH_TTL');
   }
   get jwtRefreshSecretKey(): string {
      return this.getOrThrow<string>('JWT_REFRESH_SECRET_KEY');
   }
   get authCookieDomain(): string | undefined {
      return this.get<string>('AUTH_COOKIE_DOMAIN');
   }
   get authCookieSameSite(): CookieOptions['sameSite'] {
      return this.getOrThrow<CookieOptions['sameSite']>('AUTH_COOKIE_SAME_SITE');
   }
}
