import type { appConfig } from '@infra/config/config';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ResponseStatusConstant } from '@shared/constants';
import type { UniversalResponseDto } from '@shared/dtos';
import type { IErrorDetails } from '@shared/interfaces';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface QueryDriverError {
   code?: string;
   table?: string;
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
   private readonly logger = new Logger(DatabaseExceptionFilter.name);

   constructor(private readonly appSettings: ConfigType<typeof appConfig>) {}

   catch(exception: QueryFailedError, host: ArgumentsHost): void {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest<Request>();
      const res = ctx.getResponse<Response>();
      const { status, error } = this.mapDatabaseError(req, exception);

      this.logger.error(exception.message, exception.stack);
      res.status(status).json({
         status: ResponseStatusConstant.ERROR,
         data: null,
         error,
      } satisfies UniversalResponseDto<null>);
   }

   private mapDatabaseError(
      req: Request,
      exception: QueryFailedError,
   ): { status: number; error: IErrorDetails } {
      const driverError = this.getDriverError(exception);
      const sqlCode = String(driverError.code ?? '');

      switch (sqlCode) {
         case '23505':
            return {
               status: HttpStatus.CONFLICT,
               error: this.createErrorDetails(
                  req,
                  exception,
                  'ALREADY_EXISTS',
                  'Database unique constraint violation',
                  driverError,
               ),
            };
         case '23503':
            return {
               status: HttpStatus.BAD_REQUEST,
               error: this.createErrorDetails(
                  req,
                  exception,
                  'REFERENCE_ERROR',
                  'Database reference violation',
                  driverError,
               ),
            };
         case '40P01':
            return {
               status: HttpStatus.CONFLICT,
               error: this.createErrorDetails(
                  req,
                  exception,
                  'DB_DEADLOCK',
                  'Transaction deadlock detected. Please retry',
                  driverError,
               ),
            };
         case '57P01':
         case '57P03':
            return {
               status: HttpStatus.SERVICE_UNAVAILABLE,
               error: this.createErrorDetails(
                  req,
                  exception,
                  'DB_UNAVAILABLE',
                  'Database service is unavailable',
                  driverError,
               ),
            };
         default:
            return {
               status: HttpStatus.INTERNAL_SERVER_ERROR,
               error: this.createErrorDetails(
                  req,
                  exception,
                  'DB_DRIVER_ERROR',
                  'Database driver error',
                  driverError,
               ),
            };
      }
   }

   private createErrorDetails(
      req: Request,
      exception: QueryFailedError,
      code: string,
      message: string,
      driverError: QueryDriverError,
   ): IErrorDetails {
      const error: IErrorDetails = {
         code,
         message,
      };

      if (!this.appSettings.isProduction) {
         error.debug = {
            name: exception.name,
            object: driverError.table,
            path: req.url,
            method: req.method,
            params: req.params,
            query: req.query,
         };
      }

      return error;
   }

   private getDriverError(exception: QueryFailedError): QueryDriverError {
      if (typeof exception.driverError === 'object' && exception.driverError !== null) {
         return exception.driverError as QueryDriverError;
      }

      return {};
   }
}
