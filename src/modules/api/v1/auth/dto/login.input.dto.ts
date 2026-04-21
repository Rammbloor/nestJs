import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Input DTO for login with username/password.
 */
export class LoginInputDto {
   /** User login. */
   @IsString()
   @IsNotEmpty()
   login: string;

   /** Raw password. */
   @IsString()
   @MinLength(8)
   @IsNotEmpty()
   password: string;
}
