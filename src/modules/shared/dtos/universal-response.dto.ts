import type { ResponseStatusConstant } from '@shared/constants';
import type { IErrorDetails } from '@shared/interfaces';

/**
 * Standard HTTP response envelope returned by the global transform interceptor.
 */
export class UniversalResponseDto<T> {
   /** Processing status of the request. */
   status: ResponseStatusConstant;

   /** Successful response payload. `null` when request failed. */
   data: T | null;

   /** Error details when request failed. `null` for successful responses. */
   error: IErrorDetails | null;
}
