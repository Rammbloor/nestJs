import { UserModule } from '@api/v1/user/user.module';
import { AppConfigModule } from '@infra/config/config.module';
import { RefreshSessionEntity } from '@infra/postgres/entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
   imports: [AppConfigModule, UserModule, TypeOrmModule.forFeature([RefreshSessionEntity])],
   controllers: [AuthController],
   providers: [AuthService],
})
export class AuthModule {}
