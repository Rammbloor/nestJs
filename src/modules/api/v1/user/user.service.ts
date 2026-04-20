import {
   CreateUserInputDto,
   GetUsersInputDto,
   UpdateUserInputDto,
   UserOutputDto,
} from '@api/v1/user/dto';
import { UserRepository } from '@api/v1/user/user.repository';
import type { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { UserEntity } from '@infra/postgres/entities';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PaginatedDataDto } from '@shared/dtos';
import { AlreadyExistsException } from '@shared/exceptions';
import { EntityNotFoundException } from '@shared/exceptions/entity-not-found.exception';
import { FindOneOptions } from 'typeorm';
import { IsolationLevel, Transactional } from 'typeorm-transactional';

@Injectable()
export class UserService {
   constructor(
      private userRepository: UserRepository,
      @InjectMapper() private readonly mapper: Mapper,
   ) {}

   async findOneOrThrow(options: FindOneOptions<UserEntity>): Promise<UserEntity> {
      const user = await this.findOne(options);
      if (!user) {
         throw new EntityNotFoundException('User');
      }
      return user;
   }

   async create(dto: CreateUserInputDto): Promise<UserOutputDto> {
      const { email, login, ...otherDto } = dto;
      await this.ensureUniqueUserCredentials(email, login);
      const user = this.userRepository.create({ ...otherDto, email, login });
      const savedUser = await this.userRepository.save(user);
      return this.toOutputDto(savedUser);
   }

   async getList(filters: GetUsersInputDto): Promise<PaginatedDataDto<UserOutputDto>> {
      const [users, total] = await this.userRepository.getList(filters);
      const items = this.mapper.mapArray(users, UserEntity, UserOutputDto);

      return {
         items,
         meta: {
            total,
            page: filters.page,
            limit: filters.limit,
         },
      };
   }

   @Transactional({ isolationLevel: IsolationLevel.REPEATABLE_READ })
   async update(
      id: string,
      currentUserId: string,
      dto: UpdateUserInputDto,
   ): Promise<UserOutputDto> {
      this.assertOwnership(currentUserId, id);
      const user = await this.findOneOrThrow({ where: { id } });
      const updatedUser = await this.userRepository.save({
         ...user,
         ...dto,
      });

      return this.toOutputDto(updatedUser);
   }

   @Transactional({ isolationLevel: IsolationLevel.REPEATABLE_READ })
   async delete(id: string, currentUserId: string): Promise<boolean> {
      this.assertOwnership(currentUserId, id);
      await this.findOneOrThrow({ where: { id } });
      const result = await this.userRepository.softDelete(id);
      return result.affected === 1;
   }

   async getMyProfile(id: string): Promise<UserOutputDto> {
      const user = await this.findOneOrThrow({ where: { id } });
      return this.toOutputDto(user);
   }

   private async findOne(options: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
      return this.userRepository.findActiveOne(options);
   }

   private assertOwnership(currentUserId: string, targetUserId: string): void {
      if (currentUserId !== targetUserId) {
         throw new ForbiddenException('You can only manage your own user profile');
      }
   }

   private toOutputDto(user: UserEntity): UserOutputDto {
      return this.mapper.map(user, UserEntity, UserOutputDto);
   }

   private async ensureUniqueUserCredentials(email: string, login: string): Promise<void> {
      const existingUser = await this.userRepository.findOne({
         where: [{ email }, { login }],
      });

      if (!existingUser) {
         return;
      }

      if (existingUser.email === email) {
         throw new AlreadyExistsException('User', 'email', email);
      }

      if (existingUser.login === login) {
         throw new AlreadyExistsException('User', 'login', login);
      }
   }
}
