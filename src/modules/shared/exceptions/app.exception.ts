import { HttpException, HttpStatus } from '@nestjs/common';
import type { IAppExceptionPayload } from '@shared/interfaces';

export class AppException extends HttpException {
   constructor(
      public readonly message: string,
      public readonly code: string = 'APP_ERROR',
      status: HttpStatus = HttpStatus.BAD_REQUEST,
      public readonly object?: string,
      public readonly field?: string,
      public readonly fields?: string[],
   ) {
      const response: IAppExceptionPayload = {
         message,
         code,
         object,
         field,
         fields,
      };

      super(response, status);
   }
}
