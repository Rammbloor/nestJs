import { UserOutputDto } from '@api/v1/user/dto';
import { createMap, forMember, Mapper, mapFrom } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { UserEntity } from '@infra/postgres/entities';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserProfile extends AutomapperProfile {
   constructor(@InjectMapper() mapper: Mapper) {
      super(mapper);
   }

   override get profile() {
      return (mapper: Mapper) => {
         createMap(
            mapper,
            UserEntity,
            UserOutputDto,
            forMember(
               (destination) => destination.fullName,
               mapFrom((source) => `${source.firstName} ${source.lastName}`),
            ),
         );
      };
   }
}
