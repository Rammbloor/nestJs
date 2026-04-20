import { classes } from '@automapper/classes';
import { AutomapperModule } from '@automapper/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from './v1/auth/auth.module';
import { UserModule } from './v1/user/user.module';

@Module({
   imports: [
      AutomapperModule.forRoot({
         strategyInitializer: classes(),
      }),
      AuthModule,
      UserModule,
   ],
})
export class ApiModule {}
