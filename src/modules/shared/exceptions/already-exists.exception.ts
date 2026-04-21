import { HttpStatus } from '@nestjs/common';
import { ExceptionValue } from '@shared/types';
import { AppException } from './app.exception';

export class AlreadyExistsException extends AppException {
   constructor(entity: string, field: string, value: ExceptionValue) {
      super(
         `${entity} with ${field} '${String(value)}' already exists`,
         'ALREADY_EXISTS',
         HttpStatus.CONFLICT,
         entity,
         field,
      );
   }
}
