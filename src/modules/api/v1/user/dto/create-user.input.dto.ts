import { IsEmail, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Input DTO for user registration.
 */
export class CreateUserInputDto {
   /** Public login visible to other users. */
   @IsString()
   @MinLength(3)
   @MaxLength(50)
   login: string;

   /** Unique email address used for authentication and notifications. */
   @IsEmail()
   email: string;

   /** Raw password that will be hashed before persistence. */
   @IsString()
   @MinLength(8)
   @MaxLength(128)
   password: string;

   /** Age in full years. */
   @IsInt()
   @Min(1)
   @Max(120)
   age: number;

   /** User first name. */
   @IsString()
   @MinLength(1)
   @MaxLength(100)
   firstName: string;

   /** User last name. */
   @IsString()
   @MinLength(1)
   @MaxLength(100)
   lastName: string;

   /** Short user bio shown in profile. */
   @IsString()
   @MaxLength(1000)
   description: string;
}
