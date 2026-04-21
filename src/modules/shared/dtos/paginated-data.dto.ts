import type { PaginationMetaDto } from '@shared/dtos';

/**
 * Standard paginated payload used inside the common response envelope.
 */
export class PaginatedDataDto<T> {
   /** Current page items. */
   items: T[];

   /** Pagination metadata. */
   meta: PaginationMetaDto;
}
