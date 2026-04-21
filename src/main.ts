import { appConfig, swaggerConfig } from '@infra/config/config';
import { SwaggerInitializer } from '@infra/swagger/swagger.initializer';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, DatabaseExceptionFilter } from '@shared/filters';
import { TransformInterceptor } from '@shared/interceptors';
import helmet from 'helmet';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
   initializeTransactionalContext();
   const logger = new Logger('MAIN');
   const app = await NestFactory.create(AppModule);
   const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
   const swaggerSettings = app.get<ConfigType<typeof swaggerConfig>>(swaggerConfig.KEY);

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

   if (!appSettings.isProduction) {
      const swaggerInitializer = new SwaggerInitializer(swaggerSettings);
      swaggerInitializer.init(app);
   }

   await app.listen(appSettings.port, '0.0.0.0');

   const url = await app.getUrl();

   logger.verbose(`Server started at ${url}`);
   if (!appSettings.isProduction) {
      logger.verbose(`Swagger available on ${url}${swaggerSettings.swaggerPath}`);
      logger.verbose(`Scalar available on ${url}${swaggerSettings.scalarPath}`);
   }
}
void bootstrap();
