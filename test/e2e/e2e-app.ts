import { appConfig } from '@infra/config/config';
import { AuthThrottlerGuard, throttlerConfig } from '@infra/throttler';
import { AllExceptionsFilter, DatabaseExceptionFilter } from '@shared/filters';
import { TransformInterceptor } from '@shared/interceptors';
import { INestApplication, Module, ValidationPipe, VersioningType } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken, type ThrottlerStorage, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import helmet from 'helmet';
import type { Response as SupertestResponse } from 'supertest';
import { ApiModule } from '@/modules/api/api.module';
import { AppConfigModule } from '@/modules/infra/config/config.module';
import { AppJwtModule } from '@/modules/infra/jwt/jwt.module';
import { typeOrmConfig } from '@/modules/infra/postgres/typeorm.config';
import { DataSource } from 'typeorm';

export const E2E_API_PREFIX = '/api/v1';
export const E2E_USER_AGENT = 'home-work1-e2e';
export const E2E_REFRESH_COOKIE = 'refreshToken';

type ApiResponse<T> = {
   status: 'ok' | 'error';
   data: T | null;
   error: unknown;
};

@Module({
   imports: [
      AppConfigModule,
      AppJwtModule,
      ThrottlerModule.forRootAsync(throttlerConfig),
      ApiModule,
      TypeOrmModule.forRootAsync(typeOrmConfig),
   ],
   providers: [
      {
         provide: APP_GUARD,
         useClass: AuthThrottlerGuard,
      },
   ],
})
class E2eTestModule {}

export async function bootstrapE2eApp(): Promise<{
   app: INestApplication;
   dataSource: DataSource;
}> {
   const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [E2eTestModule],
   }).compile();

   const app = moduleFixture.createNestApplication();
   const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

   app.enableCors({
      origin: appSettings.corsOrigins,
      credentials: true,
   });
   app.use(helmet());
   app.setGlobalPrefix('api');
   app.enableVersioning({ type: VersioningType.URI });
   app.useGlobalInterceptors(new TransformInterceptor());
   app.useGlobalFilters(
      new DatabaseExceptionFilter(appSettings),
      new AllExceptionsFilter(appSettings),
   );
   app.useGlobalPipes(
      new ValidationPipe({
         transform: true,
         whitelist: true,
         forbidNonWhitelisted: true,
      }),
   );

   await app.init();

   return {
      app,
      dataSource: app.get(DataSource),
   };
}

export async function resetE2eDatabase(dataSource: DataSource): Promise<void> {
   const databaseName = dataSource.options.database;

   if (typeof databaseName !== 'string' || !databaseName.toLowerCase().includes('test')) {
      throw new Error(
         `Refusing to reset a non-test database from e2e setup: "${String(databaseName)}"`,
      );
   }

   await dataSource.query('TRUNCATE TABLE "refresh_sessions", "users" RESTART IDENTITY CASCADE');
}

export function resetE2eThrottling(app: INestApplication): void {
   const storage = app.get<ThrottlerStorage & { storage?: Map<string, unknown> }>(getStorageToken());
   storage.storage?.clear();
}

export function buildCookieHeader(cookie: string): string {
   return cookie;
}

export function extractRefreshCookie(response: SupertestResponse): string {
   const rawCookies = response.headers['set-cookie'];
   const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : [rawCookies];
   const refreshCookie = cookies?.find((cookie) => cookie.startsWith(`${E2E_REFRESH_COOKIE}=`));

   if (!refreshCookie) {
      throw new Error('Refresh token cookie was not set');
   }

   return refreshCookie.split(';')[0];
}

export function createUserPayload(
   suffix: string,
   overrides: Record<string, unknown> = {},
): Record<string, unknown> {
   return {
      login: `user-${suffix}`,
      email: `user-${suffix}@example.com`,
      password: 'StrongPass123!',
      age: 32,
      firstName: 'John',
      lastName: 'Doe',
      description: 'Created by e2e tests',
      ...overrides,
   };
}

export function createLoginPayload(
   suffix: string,
   overrides: Record<string, unknown> = {},
): Record<string, unknown> {
   return {
      login: `user-${suffix}`,
      password: 'StrongPass123!',
      ...overrides,
   };
}

export function expectOkResponse<T>(response: SupertestResponse): ApiResponse<T> {
   expect(response.body).toMatchObject({
      status: 'ok',
      error: null,
   });

   return response.body as ApiResponse<T>;
}

export function expectErrorResponse(response: SupertestResponse): ApiResponse<null> {
   expect(response.body.status).toBe('error');
   expect(response.body.data).toBeNull();

   return response.body as ApiResponse<null>;
}

export function expectOkData<T>(response: SupertestResponse): T {
   const payload = expectOkResponse<T>(response);

   expect(payload.data).not.toBeNull();
   return payload.data as T;
}
