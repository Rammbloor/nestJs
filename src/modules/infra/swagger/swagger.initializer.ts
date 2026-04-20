import { AppConfigService } from '@infra/config/config.service';
import type { INestApplication } from '@nestjs/common';
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
   constructor(private readonly configService: AppConfigService) {}

   init(app: INestApplication) {
      this.configureBasicAuth(app);
      this.initializeSwagger(app);
   }

   private configureBasicAuth(app: INestApplication) {
      app.use(
         [this.configService.swaggerDocPath, this.configService.scalarDocPath],
         basicAuth({
            challenge: true,
            users: {
               [this.configService.swaggerDocLogin]: this.configService.swaggerDocPassword,
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

      SwaggerModule.setup(this.configService.swaggerDocPath, app, document, {
         swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
         },
      });

      app.use(this.configService.scalarDocPath, apiReference({ content: document }));
   }
}
