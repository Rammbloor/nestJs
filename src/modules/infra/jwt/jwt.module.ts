import { AppConfigModule } from '@infra/config/config.module';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppJwtService } from './jwt.service';

@Global()
@Module({
   imports: [AppConfigModule, JwtModule],
   providers: [AppJwtService],
   exports: [AppJwtService],
})
export class AppJwtModule {}
