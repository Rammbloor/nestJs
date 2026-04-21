import { randomUUID } from 'node:crypto';
import { jwtConfig } from '@infra/config/config';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPair, TokenPayload } from '@shared/interfaces';

@Injectable()
export class AppJwtService {
   constructor(
      private readonly jwtService: JwtService,
      @Inject(jwtConfig.KEY)
      private readonly config: ConfigType<typeof jwtConfig>,
   ) {}

   async generateTokens(userId: string, sessionId: string): Promise<AuthTokenPair> {
      const accessToken = this.jwtService.sign(
         { id: userId, sid: sessionId },
         {
            secret: this.config.accessSecretKey,
            expiresIn: this.config.accessTtl,
         },
      );

      const refreshToken = this.jwtService.sign(
         { id: userId, sid: sessionId },
         {
            secret: this.config.refreshSecretKey,
            expiresIn: this.config.refreshTtl,
            jwtid: randomUUID(),
         },
      );

      return { accessToken, refreshToken };
   }

   async verifyAccessToken(token: string): Promise<TokenPayload> {
      return this.verifyToken(token, this.config.accessSecretKey, 'access');
   }

   async verifyRefreshToken(token: string): Promise<TokenPayload> {
      return this.verifyToken(token, this.config.refreshSecretKey, 'refresh');
   }

   private async verifyToken(
      token: string,
      secret: string,
      tokenType: 'access' | 'refresh',
   ): Promise<TokenPayload> {
      try {
         const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
            secret,
         });

         if (!payload.id) {
            throw new UnauthorizedException(`Invalid ${tokenType} token`);
         }

         return payload;
      } catch {
         throw new UnauthorizedException(`Invalid ${tokenType} token`);
      }
   }
}
