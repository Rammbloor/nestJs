import { randomUUID } from 'node:crypto';
import { AppConfigService } from '@infra/config/config.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPair, TokenPayload } from '@shared/interfaces';

@Injectable()
export class AppJwtService {
   constructor(
      private readonly jwtService: JwtService,
      private readonly configService: AppConfigService,
   ) {}

   async generateTokens(userId: string, sessionId: string): Promise<AuthTokenPair> {
      const accessToken = this.jwtService.sign(
         { id: userId, sid: sessionId },
         {
            secret: this.configService.jwtAccessSecretKey,
            expiresIn: this.configService.jwtAccessTtl,
         },
      );

      const refreshToken = this.jwtService.sign(
         { id: userId, sid: sessionId },
         {
            secret: this.configService.jwtRefreshSecretKey,
            expiresIn: this.configService.jwtRefreshTtl,
            jwtid: randomUUID(),
         },
      );

      return { accessToken, refreshToken };
   }

   async verifyAccessToken(token: string): Promise<TokenPayload> {
      return this.verifyToken(token, this.configService.jwtAccessSecretKey, 'access');
   }

   async verifyRefreshToken(token: string): Promise<TokenPayload> {
      return this.verifyToken(token, this.configService.jwtRefreshSecretKey, 'refresh');
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
