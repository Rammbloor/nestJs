import { AppJwtService } from '@infra/jwt/jwt.service';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { TokenPayload } from '@shared/interfaces';
import type { Request } from 'express';

interface RequestWithUser extends Request {
   user?: TokenPayload;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
   constructor(private readonly jwtService: AppJwtService) {}

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const token = this.extractBearerToken(request);

      if (!token) {
         throw new UnauthorizedException('Access token is required');
      }

      request.user = await this.jwtService.verifyAccessToken(token);
      return true;
   }

   private extractBearerToken(request: Request): string | undefined {
      const authorization = request.header('authorization');

      if (!authorization) {
         return undefined;
      }

      const [scheme, token, ...rest] = authorization.split(' ');

      if (scheme !== 'Bearer' || !token || rest.length > 0) {
         throw new UnauthorizedException('Invalid authorization header');
      }

      return token;
   }
}
