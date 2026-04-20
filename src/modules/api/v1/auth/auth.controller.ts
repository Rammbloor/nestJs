import { AuthSessionOutputDto, AuthTokensOutputDto, LoginInputDto } from '@api/v1/auth/dto';
import { CreateUserInputDto } from '@api/v1/user/dto';
import { AppConfigService } from '@infra/config/config.service';
import { AUTH_THROTTLE_RULES } from '@infra/throttler';
import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { REFRESH_TOKEN_COOKIE_NAME } from '@shared/constants';
import { CurrentSessionId, CurrentUserId } from '@shared/decorators';
import { AccessTokenGuard } from '@shared/guards';
import {
   buildCookieOptions,
   clearRefreshTokenCookie,
   getCookieValue,
   getSessionMetadata,
   setRefreshTokenCookie,
} from '@shared/helpers';
import {
   ApiArrayDataResponse,
   ApiAuth,
   ApiBooleanResponse,
   ApiDataResponse,
} from '@shared/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller({
   path: 'auth',
   version: '1',
})
export class AuthController {
   constructor(
      private readonly authService: AuthService,
      private readonly configService: AppConfigService,
   ) {}

   @ApiOperation({ summary: 'Регистрация нового пользователя' })
   @ApiDataResponse(
      AuthTokensOutputDto,
      'Пользователь успешно зарегистрирован. Refresh token сохраняется в httpOnly cookie.',
   )
   @ApiTooManyRequestsResponse({
      description: 'Слишком много попыток регистрации. Попробуйте позже.',
   })
   @Throttle({ default: AUTH_THROTTLE_RULES.register })
   @Post('register')
   async register(
      @Body() dto: CreateUserInputDto,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
   ): Promise<AuthTokensOutputDto> {
      const session = await this.authService.register(dto, getSessionMetadata(request));

      setRefreshTokenCookie(
         response,
         session.refreshToken,
         buildCookieOptions(this.configService),
         session.refreshTokenExpiresAt,
      );

      return { accessToken: session.accessToken };
   }

   @ApiOperation({ summary: 'Вход в систему по логину и паролю' })
   @ApiDataResponse(
      AuthTokensOutputDto,
      'Access token возвращается в body. Refresh token сохраняется в httpOnly cookie.',
   )
   @ApiTooManyRequestsResponse({
      description: 'Слишком много попыток входа. Попробуйте позже.',
   })
   @Throttle({ default: AUTH_THROTTLE_RULES.login })
   @Post('login')
   async login(
      @Body() dto: LoginInputDto,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
   ): Promise<AuthTokensOutputDto> {
      const session = await this.authService.login(dto, getSessionMetadata(request));

      setRefreshTokenCookie(
         response,
         session.refreshToken,
         buildCookieOptions(this.configService),
         session.refreshTokenExpiresAt,
      );

      return { accessToken: session.accessToken };
   }

   @ApiCookieAuth('RefreshToken')
   @ApiOperation({ summary: 'Обновить access token по refresh token из httpOnly cookie' })
   @ApiDataResponse(
      AuthTokensOutputDto,
      'Refresh token ротируется и сохраняется в новой httpOnly cookie.',
   )
   @ApiTooManyRequestsResponse({
      description: 'Слишком много попыток обновления токена. Попробуйте позже.',
   })
   @Throttle({ default: AUTH_THROTTLE_RULES.refresh })
   @Post('refresh')
   async refresh(
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
   ): Promise<AuthTokensOutputDto> {
      const session = await this.authService.refresh(
         getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME) ?? '',
         getSessionMetadata(request),
      );

      setRefreshTokenCookie(
         response,
         session.refreshToken,
         buildCookieOptions(this.configService),
         session.refreshTokenExpiresAt,
      );

      return { accessToken: session.accessToken };
   }

   @ApiCookieAuth('RefreshToken')
   @ApiOperation({ summary: 'Выйти из системы и инвалидировать refresh session' })
   @ApiBooleanResponse('Сеанс успешно завершён.')
   @Post('logout')
   async logout(
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
   ): Promise<boolean> {
      await this.authService.logout(getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME));
      clearRefreshTokenCookie(response, buildCookieOptions(this.configService));
      return true;
   }

   @ApiCookieAuth('RefreshToken')
   @ApiOperation({ summary: 'Получить список активных сессий пользователя' })
   @ApiArrayDataResponse(AuthSessionOutputDto, 'Активные сессии текущего пользователя.')
   @ApiAuth()
   @UseGuards(AccessTokenGuard)
   @Get('sessions')
   async getSessions(
      @CurrentUserId() userId: string,
      @CurrentSessionId() sessionId?: string,
   ): Promise<AuthSessionOutputDto[]> {
      return this.authService.getActiveSessions(userId, sessionId);
   }

   @ApiOperation({ summary: 'Завершить текущую сессию' })
   @ApiBooleanResponse('Текущая сессия успешно завершена.')
   @ApiAuth()
   @UseGuards(AccessTokenGuard)
   @Delete('sessions/current')
   async logoutCurrentSession(
      @CurrentUserId() userId: string,
      @CurrentSessionId() sessionId: string,
      @Res({ passthrough: true }) response: Response,
   ): Promise<boolean> {
      clearRefreshTokenCookie(response, buildCookieOptions(this.configService));
      return this.authService.logoutCurrentSession(userId, sessionId);
   }

   @ApiOperation({ summary: 'Завершить все активные сессии пользователя' })
   @ApiBooleanResponse('Все активные сессии пользователя завершены.')
   @ApiAuth()
   @UseGuards(AccessTokenGuard)
   @Delete('sessions')
   async logoutAllSessions(
      @CurrentUserId() userId: string,
      @Res({ passthrough: true }) response: Response,
   ): Promise<boolean> {
      clearRefreshTokenCookie(response, buildCookieOptions(this.configService));
      return this.authService.logoutAllSessions(userId);
   }
}
