import { AuthService } from '@api/v1/auth/auth.service';
import { UserService } from '@api/v1/user/user.service';
import { AppJwtService } from '@infra/jwt/jwt.service';
import { UnauthorizedException } from '@nestjs/common';
import { hash, verify } from '@shared/helpers';
import { IsolationLevel, runInTransaction } from 'typeorm-transactional';

jest.mock('@shared/helpers', () => ({
   hash: jest.fn(),
   verify: jest.fn(),
}));

jest.mock('typeorm-transactional', () => ({
   IsolationLevel: {
      READ_COMMITTED: 'READ COMMITTED',
   },
   Transactional: () => () => ({}),
   runInTransaction: jest.fn(),
}));

describe('AuthService', () => {
   const userService = {
      create: jest.fn(),
      findOneOrThrow: jest.fn(),
   };
   const jwtService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
   };
   const refreshSessionRepository = {
      save: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
   };

   const service = new AuthService(
      userService as unknown as UserService,
      jwtService as unknown as AppJwtService,
      refreshSessionRepository as never,
   );

   beforeEach(() => {
      jest.mocked(runInTransaction).mockImplementation(async (handler: () => unknown) => handler());
   });

   afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
   });

   it('registers a user and returns tokens', async () => {
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      jest.mocked(hash).mockResolvedValue('hashed-password');
      userService.create.mockResolvedValue({ id: 'user-id' });
      refreshSessionRepository.create.mockImplementation((value) => value);
      refreshSessionRepository.save.mockResolvedValue({
         id: 'session-id',
         userId: 'user-id',
         tokenId: 'refresh-jti',
         expiresAt: new Date(123456000),
         revokedAt: null,
      });
      jwtService.generateTokens.mockResolvedValue(tokens);
      jwtService.verifyRefreshToken.mockResolvedValue({
         id: 'user-id',
         sid: 'generated-session-id',
         jti: 'refresh-jti',
         exp: 123456,
      });

      await expect(
         service.register({
            login: 'john',
            email: 'john@example.com',
            password: 'plain-password',
            age: 30,
            firstName: 'John',
            lastName: 'Doe',
            description: 'desc',
         }, {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).resolves.toEqual({
         accessToken: 'access',
         refreshToken: 'refresh',
         refreshTokenExpiresAt: new Date(123456000),
      });

      expect(userService.create).toHaveBeenCalledWith({
         login: 'john',
         email: 'john@example.com',
         password: 'hashed-password',
         age: 30,
         firstName: 'John',
         lastName: 'Doe',
         description: 'desc',
      });
      expect(refreshSessionRepository.save).toHaveBeenCalledTimes(1);

      const createdSessionId = jwtService.generateTokens.mock.calls[0][1];

      expect(jwtService.generateTokens).toHaveBeenCalledWith('user-id', createdSessionId);
      expect(refreshSessionRepository.save).toHaveBeenCalledWith(
         expect.objectContaining({
            id: createdSessionId,
            userId: 'user-id',
            tokenId: 'refresh-jti',
            expiresAt: new Date(123456000),
            revokedAt: null,
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      );
   });

   it('rejects invalid credentials on login', async () => {
      userService.findOneOrThrow.mockResolvedValue({ id: 'user-id', password: 'hashed-password' });
      jest.mocked(verify).mockResolvedValue(false);

      await expect(
         service.login({
            login: 'john',
            password: 'bad-password',
         }, {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
   });

   it('refreshes tokens and revokes the old refresh token', async () => {
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      refreshSessionRepository.update.mockResolvedValue({ affected: 1 });
      refreshSessionRepository.create.mockImplementation((value) => value);
      refreshSessionRepository.save.mockResolvedValue({
         id: 'new-session-id',
         userId: 'user-id',
         tokenId: 'new-token-jti',
         expiresAt: new Date(123456000),
         revokedAt: null,
      });
      jwtService.generateTokens.mockResolvedValue(tokens);
      jwtService.verifyRefreshToken
         .mockResolvedValueOnce({
            id: 'user-id',
            sid: 'session-id',
            jti: 'token-jti',
            exp: 123456,
         })
         .mockResolvedValueOnce({
            id: 'user-id',
            sid: 'new-session-id',
            jti: 'new-token-jti',
            exp: 123456,
         });

      await expect(
         service.refresh('refresh-token', {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).resolves.toEqual({
         accessToken: 'access',
         refreshToken: 'refresh',
         refreshTokenExpiresAt: new Date(123456000),
      });

      expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function), {
         isolationLevel: IsolationLevel.READ_COMMITTED,
      });
      expect(refreshSessionRepository.update).toHaveBeenCalledWith(
         expect.objectContaining({
            id: 'session-id',
            userId: 'user-id',
            tokenId: 'token-jti',
         }),
         expect.objectContaining({
            revokedAt: expect.any(Date),
         }),
      );
      expect(refreshSessionRepository.save).toHaveBeenCalledTimes(1);
   });

   it('rejects refresh token replay when session revoke affects no rows', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
         id: 'user-id',
         sid: 'session-id',
         jti: 'token-jti',
         exp: 123456,
      });
      refreshSessionRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
         service.refresh('refresh-token', {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwtService.generateTokens).not.toHaveBeenCalled();
      expect(refreshSessionRepository.save).not.toHaveBeenCalled();
   });

   it('rejects refresh when token payload is incomplete', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
         id: 'user-id',
         sid: 'session-id',
      });

      await expect(
         service.refresh('refresh-token', {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(refreshSessionRepository.update).not.toHaveBeenCalled();
   });

   it('propagates session creation errors after the revoke step during refresh', async () => {
      const expectedError = new Error('db unavailable');

      refreshSessionRepository.update.mockResolvedValue({ affected: 1 });
      refreshSessionRepository.create.mockImplementation((value) => value);
      jwtService.generateTokens.mockResolvedValue({
         accessToken: 'access',
         refreshToken: 'refresh',
      });
      jwtService.verifyRefreshToken
         .mockResolvedValueOnce({
            id: 'user-id',
            sid: 'session-id',
            jti: 'token-jti',
            exp: 123456,
         })
         .mockResolvedValueOnce({
            id: 'user-id',
            sid: 'new-session-id',
            jti: 'new-token-jti',
            exp: 123456,
         });
      refreshSessionRepository.save.mockRejectedValue(expectedError);

      await expect(
         service.refresh('refresh-token', {
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
         }),
      ).rejects.toThrow(expectedError);

      expect(refreshSessionRepository.update).toHaveBeenCalledTimes(1);
   });

   it('returns true on logout when refresh token is already invalid', async () => {
      jwtService.verifyRefreshToken.mockRejectedValue(new UnauthorizedException('Invalid refresh'));

      await expect(service.logout('refresh-token')).resolves.toBe(true);

      expect(refreshSessionRepository.update).not.toHaveBeenCalled();
   });

   it('logs out by revoking the refresh token', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
         id: 'user-id',
         sid: 'session-id',
         jti: 'token-jti',
         exp: 123456,
      });
      refreshSessionRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.logout('refresh-token')).resolves.toBe(true);

      expect(refreshSessionRepository.update).toHaveBeenCalledWith(
         expect.objectContaining({
            id: 'session-id',
            userId: 'user-id',
            tokenId: 'token-jti',
         }),
         expect.objectContaining({
            revokedAt: expect.any(Date),
         }),
      );
   });
});
