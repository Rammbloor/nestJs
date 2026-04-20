import { SwaggerInitializer } from '@infra/swagger/swagger.initializer';
import type { AppConfigService } from '@infra/config/config.service';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';

jest.mock('@nestjs/swagger', () => {
   const builder = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addApiKey: jest.fn().mockReturnThis(),
      addBearerAuth: jest.fn().mockReturnThis(),
      addCookieAuth: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
   };

   return {
      DocumentBuilder: jest.fn(() => builder),
      SwaggerModule: {
         createDocument: jest.fn(() => ({ openapi: '3.0.0', paths: {} })),
         setup: jest.fn(),
      },
   };
});

jest.mock('@scalar/nestjs-api-reference', () => ({
   apiReference: jest.fn(() => 'scalar-middleware'),
}));

jest.mock('express-basic-auth', () => jest.fn(() => 'basic-auth-middleware'));
jest.mock('helmet', () => jest.fn(() => 'helmet-middleware'));

describe('SwaggerInitializer', () => {
   const configService = {
      swaggerDocPath: '/docs',
      scalarDocPath: '/docs/scalar',
      swaggerDocLogin: 'admin',
      swaggerDocPassword: 'admin',
   } as unknown as AppConfigService;

   it('protects docs routes and relaxes CSP for Scalar and Swagger UI', () => {
      const app = {
         use: jest.fn(),
      };

      const initializer = new SwaggerInitializer(configService);
      initializer.init(app as unknown as INestApplication);

      expect(app.use).toHaveBeenCalledWith(
         ['/docs', '/docs/scalar'],
         'basic-auth-middleware',
         'helmet-middleware',
      );
      expect(basicAuth).toHaveBeenCalledWith({
         challenge: true,
         users: {
            admin: 'admin',
         },
      });
      expect(helmet).toHaveBeenCalledWith({
         contentSecurityPolicy: expect.objectContaining({
            useDefaults: true,
            directives: expect.objectContaining({
               scriptSrc: expect.arrayContaining(["'unsafe-inline'", 'https://cdn.jsdelivr.net']),
               styleSrc: expect.arrayContaining(["'unsafe-inline'", 'https://cdn.jsdelivr.net']),
            }),
         }),
      });
      expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
      expect(SwaggerModule.setup).toHaveBeenCalledWith('/docs', app, expect.any(Object), {
         swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
         },
      });
      expect(apiReference).toHaveBeenCalledWith({ content: { openapi: '3.0.0', paths: {} } });
      expect(DocumentBuilder).toHaveBeenCalledTimes(1);
   });
});
