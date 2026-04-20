import { AppConfigService } from '@infra/config/config.service';
import { SwaggerInitializer } from '@infra/swagger/swagger.initializer';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
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
   const configService = app.get(AppConfigService);

   app.enableCors({
      origin: configService.corsOrigins,
      credentials: true,
   });
   app.use(helmet());
   app.setGlobalPrefix('api');
   app.enableVersioning({ type: VersioningType.URI });
   app.useGlobalInterceptors(new TransformInterceptor());
   app.useGlobalFilters(
      new DatabaseExceptionFilter(configService),
      new AllExceptionsFilter(configService),
   );
   app.useGlobalPipes(
      new ValidationPipe({
         transform: true,
         whitelist: true,
         forbidNonWhitelisted: true,
      }),
   );

   if (!configService.isProduction) {
      const swaggerInitializer = new SwaggerInitializer(configService);
      swaggerInitializer.init(app);
   }

   await app.listen(configService.serverPort, '0.0.0.0');

   const url = await app.getUrl();

   logger.verbose(`Server started at ${url}`);
   if (!configService.isProduction) {
      logger.verbose(`Swagger available on ${url}${configService.swaggerDocPath}`);
      logger.verbose(`Scalar available on ${url}${configService.scalarDocPath}`);
   }
}
void bootstrap();
