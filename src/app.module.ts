import { ApiModule } from '@api/api.module';
import { AppConfigModule } from '@infra/config/config.module';
import { AppJwtModule } from '@infra/jwt/jwt.module';
import { typeOrmConfig } from '@infra/postgres/typeorm.config';
import { AuthThrottlerGuard, throttlerConfig } from '@infra/throttler';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
   imports: [
      AppConfigModule,
      AppJwtModule,
      TypeOrmModule.forRootAsync(typeOrmConfig),
      ThrottlerModule.forRootAsync(throttlerConfig),
      ApiModule,
   ],
   providers: [
      {
         provide: APP_GUARD,
         useClass: AuthThrottlerGuard,
      },
   ],
})
export class AppModule {}
