import type { appConfig } from '@infra/config/config';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ResponseStatusConstant } from '@shared/constants';
import type { UniversalResponseDto } from '@shared/dtos';
import type { IAppExceptionPayload, IErrorDetails } from '@shared/interfaces';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
   private readonly logger = new Logger(AllExceptionsFilter.name);

   constructor(private readonly appSettings: ConfigType<typeof appConfig>) {}

   catch(exception: unknown, host: ArgumentsHost): void {
      const ctx = host.switchToHttp();
      const req = ctx.getRequest<Request>();
      const res = ctx.getResponse<Response>();
      const status = this.getStatus(exception);

      this.logger.error(this.getLogMessage(exception));
      const errorResponse = this.getErrorResponse(req, exception);
      res.status(status).json(errorResponse);
   }

   private getErrorResponse(req: Request, exception: unknown): UniversalResponseDto<null> {
      const isProduction = this.appSettings.isProduction;
      const payload = this.getExceptionPayload(exception);
      const errorCode = this.pickFirstValue(payload.code) ?? this.getExceptionName(exception);
      const error: IErrorDetails = {
         code: errorCode,
         field: payload.field,
         fields: payload.fields,
         message: this.getErrorMessage(exception, payload),
      };

      if (!isProduction) {
         error.debug = {
            name: this.getExceptionName(exception),
            object: payload.object,
            currentStatus: payload.currentStatus,
            expectedStatuses: payload.expectedStatuses,
            path: req.url,
            method: req.method,
            params: req.params,
            query: req.query,
         };
      }

      return {
         status: ResponseStatusConstant.ERROR,
         data: null,
         error,
      };
   }

   private getStatus(exception: unknown): number {
      if (exception instanceof HttpException) {
         return exception.getStatus();
      }

      return HttpStatus.INTERNAL_SERVER_ERROR;
   }

   private getErrorMessage(exception: unknown, payload: IAppExceptionPayload): string {
      const payloadMessage = this.pickFirstValue(payload.message);

      if (payloadMessage) {
         return payloadMessage;
      }

      if (exception instanceof Error) {
         return exception.message;
      }

      return 'Internal server error';
   }

   private getExceptionPayload(exception: unknown): IAppExceptionPayload {
      if (!(exception instanceof HttpException)) {
         return {};
      }

      const response = exception.getResponse();

      if (typeof response === 'string') {
         return { message: response };
      }

      if (this.isAppExceptionPayload(response)) {
         return response;
      }

      return {};
   }

   private getExceptionName(exception: unknown): string | undefined {
      if (exception instanceof Error) {
         return exception.name;
      }

      return undefined;
   }

   private getLogMessage(exception: unknown): string {
      if (exception instanceof Error) {
         return exception.stack ?? exception.message;
      }

      try {
         return JSON.stringify(exception);
      } catch {
         return 'Unknown exception';
      }
   }

   private pickFirstValue(value?: string | string[]): string | undefined {
      if (Array.isArray(value)) {
         return value[0];
      }

      return value;
   }

   private isAppExceptionPayload(value: unknown): value is IAppExceptionPayload {
      return typeof value === 'object' && value !== null;
   }
}
