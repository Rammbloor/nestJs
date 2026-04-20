import { UniversalPaginationDto } from '@shared/dtos';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Input DTO for filtering the users list.
 */
export class GetUsersInputDto extends UniversalPaginationDto {
   /** Full-text search by first name, last name, email or login. */
   @IsOptional()
   @IsString()
   @MaxLength(100)
   search?: string;
}
