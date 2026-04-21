import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Input DTO for updating editable profile fields.
 */
export class UpdateUserInputDto {
   /** User first name. */
   @IsOptional()
   @IsString()
   @MinLength(1)
   @MaxLength(100)
   firstName: string;

   /** User last name. */
   @IsOptional()
   @IsString()
   @MinLength(1)
   @MaxLength(100)
   lastName: string;

   /** Age in full years. */
   @IsOptional()
   @IsInt()
   @Min(1)
   @Max(120)
   age: number;

   /** Short user bio shown in profile. */
   @IsOptional()
   @IsString()
   @MaxLength(1000)
   description: string;
}
