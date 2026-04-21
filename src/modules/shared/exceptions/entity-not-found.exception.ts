import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

export class EntityNotFoundException extends AppException {
   constructor(entity: string) {
      super(`${entity}  not found`, 'ENTITY_NOT_FOUND', HttpStatus.NOT_FOUND, entity);
   }
}
