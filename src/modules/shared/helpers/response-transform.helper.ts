import { ResponseStatusConstant } from '@shared/constants';
import { UniversalResponseDto } from '@shared/dtos';

export function responseTransform<T>(data: T): UniversalResponseDto<T> {
   return {
      status: ResponseStatusConstant.OK,
      data,
      error: null,
   };
}
