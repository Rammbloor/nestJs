import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensOutputDto {
   @ApiProperty({
      description: 'JWT access token for Authorization header.',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
   })
   @AutoMap()
   accessToken: string;
}
