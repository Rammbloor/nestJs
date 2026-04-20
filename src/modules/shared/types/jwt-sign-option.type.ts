import type { JwtSignOptions } from '@nestjs/jwt';

export type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;
