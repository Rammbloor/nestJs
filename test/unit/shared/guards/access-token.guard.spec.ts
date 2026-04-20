import { AppJwtService } from '@infra/jwt/jwt.service';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from '@shared/guards';

describe('AccessTokenGuard', () => {
   const jwtService = {
      verifyAccessToken: jest.fn(),
   };

   const guard = new AccessTokenGuard(jwtService as unknown as AppJwtService);

   function buildContext(authorization?: string): {
      context: ExecutionContext;
      request: { header: jest.Mock };
   } {
      const request = {
         header: jest.fn().mockReturnValue(authorization),
      };

      const context = {
         switchToHttp: () => ({
            getRequest: () => request,
         }),
      } as unknown as ExecutionContext;

      return { context, request };
   }

   afterEach(() => {
      jest.clearAllMocks();
   });

   it('attaches the verified payload to the request', async () => {
      const { context, request } = buildContext('Bearer access-token');
      jwtService.verifyAccessToken.mockResolvedValue({ id: 'user-id' });

      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(jwtService.verifyAccessToken).toHaveBeenCalledWith('access-token');
      expect(request).toMatchObject({
         user: { id: 'user-id' },
      });
   });

   it('rejects missing authorization header', async () => {
      const { context } = buildContext(undefined);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
   });
});
