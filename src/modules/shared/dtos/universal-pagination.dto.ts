import { SortOrderConstant, type SortOrderConstant as SortOrderValue } from '@shared/constants';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UniversalPaginationDto {
   /** Page number starting from 1. */
   @IsOptional()
   @Min(1)
   @IsInt()
   @Type(() => Number)
   page: number = 1;

   /** Maximum number of items returned per page. */
   @IsOptional()
   @Min(1)
   @Max(100)
   @IsInt()
   @Type(() => Number)
   limit: number = 15;

   /** Entity field used for sorting. */
   @IsOptional()
   @IsString()
   orderBy: string = 'createdAt';

   /** Sort direction. */
   @IsOptional()
   @IsIn(Object.values(SortOrderConstant))
   order: SortOrderValue = SortOrderConstant.DESC;

   get skip(): number {
      return (this.page - 1) * this.limit;
   }
}
