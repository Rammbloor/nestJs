import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionOutputDto {
   @ApiProperty({
      description: 'Session identifier.',
      example: '4f7c5397-a7c3-4598-8ce8-f6344a3b47af',
   })
   id: string;

   @ApiProperty({
      description: 'Whether this session is the one used for the current request.',
      example: true,
   })
   isCurrent: boolean;

   @ApiProperty({
      description: 'Session creation timestamp.',
      example: '2026-04-20T09:30:00.000Z',
   })
   createdAt: Date;

   @ApiProperty({
      description: 'Session expiration timestamp.',
      example: '2026-05-20T09:30:00.000Z',
   })
   expiresAt: Date;

   @ApiProperty({
      description: 'Session revocation timestamp. Null when session is active.',
      example: null,
      nullable: true,
   })
   revokedAt: Date | null;

   @ApiProperty({
      description: 'IP address that created the session.',
      example: '127.0.0.1',
      nullable: true,
   })
   ipAddress: string | null;

   @ApiProperty({
      description: 'User agent captured when the session was created.',
      example: 'Mozilla/5.0',
      nullable: true,
   })
   userAgent: string | null;
}
