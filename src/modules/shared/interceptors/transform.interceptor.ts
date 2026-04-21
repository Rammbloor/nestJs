import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { UniversalResponseDto } from '@shared/dtos';
import { responseTransform } from '@shared/helpers';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, UniversalResponseDto<T>> {
   intercept(_context: ExecutionContext, next: CallHandler): Observable<UniversalResponseDto<T>> {
      return next.handle().pipe(map((data): UniversalResponseDto<T> => responseTransform<T>(data)));
   }
}
