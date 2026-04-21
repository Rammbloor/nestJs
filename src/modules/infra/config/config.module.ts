import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentConstant } from '@shared/constants';
import { validate } from '@shared/helpers';
import {
   appConfig,
   authCookieConfig,
   databaseConfig,
   jwtConfig,
   swaggerConfig,
   throttlerEnvConfig,
} from './config';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         load: [
            appConfig,
            authCookieConfig,
            databaseConfig,
            jwtConfig,
            swaggerConfig,
            throttlerEnvConfig,
         ],
         validate,
         envFilePath: process.env.NODE_ENV === EnvironmentConstant.TEST ? '.env.test' : '.env',
      }),
   ],
})
export class AppConfigModule {}
