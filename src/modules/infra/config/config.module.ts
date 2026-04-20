import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvironmentConstant } from '@shared/constants';
import { validate } from '@shared/helpers';
import { AppConfigService } from './config.service';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate,
         envFilePath:
            process.env.NODE_ENV === EnvironmentConstant.TEST ? '.env.test' : '.env',
      }),
   ],
   providers: [AppConfigService],
   exports: [AppConfigService],
})
export class AppConfigModule {}
