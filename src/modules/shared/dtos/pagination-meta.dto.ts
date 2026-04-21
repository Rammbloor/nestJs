/**
 * Pagination metadata for list responses.
 */
export class PaginationMetaDto {
   /** Total number of matched records. */
   total: number;

   /** Current page number. */
   page: number;

   /** Maximum number of records per page. */
   limit: number;
}
