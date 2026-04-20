import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TokenPayload } from '@shared/interfaces';
import type { Request } from 'express';

interface RequestWithUser extends Request {
   user?: TokenPayload;
}

export const CurrentUser = createParamDecorator(
   (_data: unknown, context: ExecutionContext): TokenPayload | undefined => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      return request.user;
   },
);

export const CurrentUserId = createParamDecorator(
   (_data: unknown, context: ExecutionContext): string | undefined => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      return request.user?.id;
   },
);

export const CurrentSessionId = createParamDecorator(
   (_data: unknown, context: ExecutionContext): string | undefined => {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      return request.user?.sid;
   },
);
