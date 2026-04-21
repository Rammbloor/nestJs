import { GetUsersInputDto } from '@api/v1/user/dto';
import { UserEntity } from '@infra/postgres/entities';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, FindOneOptions, IsNull, Repository } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
   constructor(@InjectDataSource() dataSource: DataSource) {
      super(UserEntity, dataSource.createEntityManager());
   }

   public async getList(filters: GetUsersInputDto): Promise<[UserEntity[], number]> {
      const sortableFields: Record<string, string> = {
         createdAt: 'user.createdAt',
         email: 'user.email',
         login: 'user.login',
         firstName: 'user.firstName',
         lastName: 'user.lastName',
         age: 'user.age',
      };

      const qb = this.createQueryBuilder('user').where('user.deletedAt IS NULL');
      const search = filters.search?.trim();

      if (search) {
         qb.andWhere(
            new Brackets((subQb) => {
               subQb
                  .where('user.firstName ILIKE :search', { search: `%${search}%` })
                  .orWhere('user.lastName ILIKE :search', { search: `%${search}%` })
                  .orWhere('user.email ILIKE :search', { search: `%${search}%` })
                  .orWhere('user.login ILIKE :search', { search: `%${search}%` });
            }),
         );
      }

      const sortField = sortableFields[filters.orderBy] ?? sortableFields.createdAt;

      qb.orderBy(sortField, filters.order).skip(filters.skip).take(filters.limit);

      return qb.getManyAndCount();
   }

   public findActiveOne(options: FindOneOptions<UserEntity>): Promise<UserEntity | null> {
      return this.findOne({
         ...options,
         where: {
            ...options.where,
            deletedAt: IsNull(),
         },
      });
   }
}
