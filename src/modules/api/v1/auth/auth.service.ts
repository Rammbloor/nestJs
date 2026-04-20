import { randomUUID } from 'node:crypto';
import { AuthSessionOutputDto, LoginInputDto } from '@api/v1/auth/dto';
import { CreateUserInputDto } from '@api/v1/user/dto';
import { UserService } from '@api/v1/user/user.service';
import { AppJwtService } from '@infra/jwt/jwt.service';
import { RefreshSessionEntity, UserEntity } from '@infra/postgres/entities';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from '@shared/helpers';
import { AuthSessionResult, SessionMetadata, TokenPayload } from '@shared/interfaces';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { IsolationLevel, runInTransaction } from 'typeorm-transactional';

@Injectable()
export class AuthService {
   constructor(
      private readonly userService: UserService,
      private readonly jwtService: AppJwtService,
      @InjectRepository(RefreshSessionEntity)
      private readonly refreshSessionRepository: Repository<RefreshSessionEntity>,
   ) {}

   async register(dto: CreateUserInputDto, metadata: SessionMetadata): Promise<AuthSessionResult> {
      const user = await this.userService.create({
         ...dto,
         password: await hash(dto.password),
      });

      return this.createAuthSession(user.id, metadata);
   }

   async login(dto: LoginInputDto, metadata: SessionMetadata): Promise<AuthSessionResult> {
      const user = await this.findUserByLogin(dto.login);
      await this.ensurePasswordIsValid(dto.password, user.password);

      return this.createAuthSession(user.id, metadata);
   }

   async refresh(refreshToken: string, metadata: SessionMetadata): Promise<AuthSessionResult> {
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);

      return runInTransaction(
         async () => {
            await this.revokeActiveRefreshSessionOrThrow(payload);
            return this.createAuthSession(payload.id, metadata);
         },
         {
            isolationLevel: IsolationLevel.READ_COMMITTED,
         },
      );
   }

   async logout(refreshToken?: string): Promise<boolean> {
      if (!refreshToken) {
         return true;
      }

      try {
         const payload = await this.jwtService.verifyRefreshToken(refreshToken);
         await this.revokeActiveRefreshSession(payload);
      } catch {
         return true;
      }

      return true;
   }

   async getActiveSessions(
      userId: string,
      currentSessionId?: string,
   ): Promise<AuthSessionOutputDto[]> {
      const sessions = await this.refreshSessionRepository.find({
         where: {
            userId,
            revokedAt: IsNull(),
            expiresAt: MoreThan(new Date()),
         },
         order: {
            createdAt: 'DESC',
         },
      });

      return sessions.map((session) => ({
         id: session.id,
         isCurrent: session.id === currentSessionId,
         createdAt: session.createdAt,
         expiresAt: session.expiresAt,
         revokedAt: session.revokedAt,
         ipAddress: session.ipAddress,
         userAgent: session.userAgent,
      }));
   }

   async logoutCurrentSession(userId: string, sessionId?: string): Promise<boolean> {
      if (!sessionId) {
         throw new UnauthorizedException('Current session is missing');
      }

      const revokeResult = await this.refreshSessionRepository.update(
         {
            id: sessionId,
            userId,
            revokedAt: IsNull(),
            expiresAt: MoreThan(new Date()),
         },
         {
            revokedAt: new Date(),
         },
      );

      if ((revokeResult.affected ?? 0) === 0) {
         throw new UnauthorizedException('Current session is invalid or expired');
      }

      return true;
   }

   async logoutAllSessions(userId: string): Promise<boolean> {
      await this.refreshSessionRepository.update(
         {
            userId,
            revokedAt: IsNull(),
            expiresAt: MoreThan(new Date()),
         },
         {
            revokedAt: new Date(),
         },
      );

      return true;
   }

   private async createAuthSession(
      userId: string,
      metadata: SessionMetadata,
   ): Promise<AuthSessionResult> {
      const sessionId = randomUUID();
      const tokens = await this.jwtService.generateTokens(userId, sessionId);
      const refreshPayload = await this.jwtService.verifyRefreshToken(tokens.refreshToken);

      this.assertRefreshTokenPayload(refreshPayload);

      const session = await this.refreshSessionRepository.save(
         this.refreshSessionRepository.create({
            id: sessionId,
            userId,
            tokenId: refreshPayload.jti,
            expiresAt: new Date(refreshPayload.exp * 1000),
            revokedAt: null,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
         }),
      );

      return {
         accessToken: tokens.accessToken,
         refreshToken: tokens.refreshToken,
         refreshTokenExpiresAt: session.expiresAt,
      };
   }

   private async findUserByLogin(login: string): Promise<UserEntity> {
      try {
         return await this.userService.findOneOrThrow({ where: { login } });
      } catch {
         throw new UnauthorizedException('Invalid credentials');
      }
   }

   private async ensurePasswordIsValid(
      plainPassword: string,
      hashedPassword: string,
   ): Promise<void> {
      const isPasswordValid = await verify(plainPassword, hashedPassword);

      if (!isPasswordValid) {
         throw new UnauthorizedException('Invalid credentials');
      }
   }

   private async revokeActiveRefreshSessionOrThrow(payload: TokenPayload): Promise<void> {
      const isRevoked = await this.revokeActiveRefreshSession(payload);

      if (!isRevoked) {
         throw new UnauthorizedException('Refresh session is invalid or expired');
      }
   }

   private async revokeActiveRefreshSession(payload: TokenPayload): Promise<boolean> {
      this.assertRefreshTokenPayload(payload);

      const revokeResult = await this.refreshSessionRepository.update(
         {
            id: payload.sid,
            userId: payload.id,
            tokenId: payload.jti,
            revokedAt: IsNull(),
            expiresAt: MoreThan(new Date()),
         },
         {
            revokedAt: new Date(),
         },
      );

      return (revokeResult.affected ?? 0) > 0;
   }

   private assertRefreshTokenPayload(
      payload: TokenPayload,
   ): asserts payload is TokenPayload & { sid: string; jti: string; exp: number } {
      if (!payload.sid || !payload.jti || !payload.exp) {
         throw new UnauthorizedException('Refresh token payload is incomplete');
      }
   }
}
