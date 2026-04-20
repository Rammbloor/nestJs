import { AutoMap } from '@automapper/classes';

/**
 * Output DTO returned to API clients after entity-to-response mapping.
 */
export class UserOutputDto {
   @AutoMap()
   id: string;

   @AutoMap()
   email: string;

   @AutoMap()
   login: string;

   @AutoMap()
   description: string;

   @AutoMap()
   age: number;

   @AutoMap()
   firstName: string;

   @AutoMap()
   lastName: string;

   @AutoMap()
   createdAt!: Date;

   @AutoMap()
   fullName: string;
}
