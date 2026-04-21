import { UserProfile } from '@api/v1/user/profile';
import { UserEntity } from '@infra/postgres/entities';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessTokenGuard } from '@shared/guards';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
   imports: [TypeOrmModule.forFeature([UserEntity])],
   controllers: [UserController],
   providers: [UserService, UserProfile, UserRepository, AccessTokenGuard],
   exports: [UserService, UserRepository],
})
export class UserModule {}
