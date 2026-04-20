import { AUTH_COOKIE_SAME_SITE_VALUES, EnvironmentConstant } from '@shared/constants';
import { plainToInstance } from 'class-transformer';
import {
   IsIn,
   IsInt,
   IsNotEmpty,
   IsOptional,
   IsString,
   Min,
   ValidateIf,
   validateSync,
} from 'class-validator';

export class EnvironmentVariables {
   @IsIn(Object.values(EnvironmentConstant))
   NODE_ENV: EnvironmentConstant;

   @IsOptional()
   @IsInt()
   SERVER_PORT: number = 3000;

   @IsNotEmpty()
   @IsString()
   POSTGRES_HOST: string;

   @IsInt()
   POSTGRES_PORT: number;

   @IsNotEmpty()
   @IsString()
   POSTGRES_USER: string;

   @IsNotEmpty()
   @IsString()
   POSTGRES_PASSWORD: string;

   @IsNotEmpty()
   @IsString()
   POSTGRES_DB: string;

   @ValidateIf((env) => env.NODE_ENV !== EnvironmentConstant.PRODUCTION)
   @IsNotEmpty()
   @IsString()
   SWAGGER_LOGIN?: string;

   @ValidateIf((env) => env.NODE_ENV !== EnvironmentConstant.PRODUCTION)
   @IsNotEmpty()
   @IsString()
   SWAGGER_PASSWORD?: string;

   @IsOptional()
   @IsString()
   SWAGGER_PATH: string = '/docs';

   @IsOptional()
   @IsString()
   SCALAR_PATH: string = '/docs/scalar';

   @IsOptional()
   @IsInt()
   @Min(1)
   THROTTLER_TTL: number = 1;

   @IsOptional()
   @IsInt()
   @Min(1)
   THROTTLER_LIMIT: number = 10;

   @IsOptional()
   @IsString()
   CORS_ORIGINS: string = '';

   @IsOptional()
   @IsString()
   JWT_ACCESS_TTL: string;

   @IsString()
   @IsNotEmpty()
   JWT_ACCESS_SECRET_KEY: string;

   @IsOptional()
   @IsString()
   JWT_REFRESH_TTL: string;

   @IsString()
   @IsNotEmpty()
   JWT_REFRESH_SECRET_KEY: string;

   @IsOptional()
   @IsString()
   AUTH_COOKIE_DOMAIN?: string;

   @IsOptional()
   @IsIn(AUTH_COOKIE_SAME_SITE_VALUES)
   AUTH_COOKIE_SAME_SITE: (typeof AUTH_COOKIE_SAME_SITE_VALUES)[number] = 'lax';
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
   const validatedConfig = plainToInstance(EnvironmentVariables, config, {
      enableImplicitConversion: true,
   });

   const errors = validateSync(validatedConfig, {
      skipMissingProperties: false,
   });

   if (errors.length > 0) {
      throw new Error(errors.flatMap((error) => Object.values(error.constraints ?? {})).join('\n'));
   }

   return validatedConfig;
}
