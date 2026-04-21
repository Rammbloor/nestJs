import type { swaggerConfig } from '@infra/config/config';
import type { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';

const docsContentSecurityPolicy = {
   useDefaults: true,
   directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
   },
} as const;

export class SwaggerInitializer {
   constructor(private readonly config: ConfigType<typeof swaggerConfig>) {}

   init(app: INestApplication) {
      this.configureBasicAuth(app);
      this.initializeSwagger(app);
   }

   private configureBasicAuth(app: INestApplication) {
      app.use(
         [this.config.swaggerPath, this.config.scalarPath],
         basicAuth({
            challenge: true,
            users: {
               [this.config.login ?? '']: this.config.password ?? '',
            },
         }),
         helmet({
            contentSecurityPolicy: docsContentSecurityPolicy,
         }),
      );
   }

   private initializeSwagger(app: INestApplication) {
      const config = new DocumentBuilder()
         .setTitle('My Home_Work API')
         .setDescription('Описание API')
         .setVersion('1.0')

         .addBearerAuth(
            {
               type: 'http',
               scheme: 'bearer',
               bearerFormat: 'JWT',
               description: 'JWT access token',
            },
            'AccessToken',
         )
         .addCookieAuth(
            'refreshToken',
            {
               type: 'apiKey',
               in: 'cookie',
               name: 'refreshToken',
               description: 'HTTP-only refresh token cookie',
            },
            'RefreshToken',
         )
         .build();

      const document = SwaggerModule.createDocument(app, config);

      SwaggerModule.setup(this.config.swaggerPath, app, document, {
         swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
         },
      });

      app.use(this.config.scalarPath, apiReference({ content: document }));
   }
}
