import { randomUUID } from 'node:crypto';
import { UserOutputDto } from '@api/v1/user/dto';
import { DataSource } from 'typeorm';
import request from 'supertest';
import {
   bootstrapE2eApp,
   buildCookieHeader,
   createLoginPayload,
   createUserPayload,
   E2E_API_PREFIX,
   E2E_USER_AGENT,
   expectErrorResponse,
   expectOkData,
   resetE2eThrottling,
   extractRefreshCookie,
   resetE2eDatabase,
} from './e2e/e2e-app';

type AuthResponseBody = {
   accessToken: string;
};

type UserRequestBody = {
   login: string;
   email: string;
   password: string;
   age: number;
   firstName: string;
   lastName: string;
   description: string;
};

type SessionResponseBody = {
   id: string;
   isCurrent: boolean;
   createdAt: string;
   expiresAt: string;
   revokedAt: string | null;
   ipAddress: string | null;
   userAgent: string | null;
};

type ProfileResponseBody = UserOutputDto;

type PaginatedUsersResponseBody = {
   items: UserOutputDto[];
   meta: {
      total: number;
      page: number;
      limit: number;
   };
};

describe('Auth and Users API (e2e)', () => {
   let app: Awaited<ReturnType<typeof bootstrapE2eApp>>['app'];
   let dataSource: DataSource;

   beforeAll(async () => {
      const bootstrapped = await bootstrapE2eApp();
      app = bootstrapped.app;
      dataSource = bootstrapped.dataSource;
   });

   afterAll(async () => {
      if (app) {
         await app.close();
      }
   });

   beforeEach(async () => {
      await resetE2eDatabase(dataSource);
      resetE2eThrottling(app);
   });

   function authHeaders(accessToken: string): Record<string, string> {
      return {
         Authorization: `Bearer ${accessToken}`,
         'User-Agent': E2E_USER_AGENT,
      };
   }

   async function registerUser(suffix: string, overrides: Record<string, unknown> = {}) {
      const body = createUserPayload(suffix, overrides) as UserRequestBody;
      const response = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/register`)
         .set('User-Agent', E2E_USER_AGENT)
         .send(body)
         .expect(201);

      const payload = expectOkData<AuthResponseBody>(response);

      return {
         user: body,
         accessToken: payload.accessToken,
         refreshCookie: extractRefreshCookie(response),
         response,
      };
   }

   async function loginUser(suffix: string, overrides: Record<string, unknown> = {}) {
      const body = createLoginPayload(suffix, overrides);
      const response = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/login`)
         .set('User-Agent', E2E_USER_AGENT)
         .send(body)
         .expect(201);

      const payload = expectOkData<AuthResponseBody>(response);

      return {
         accessToken: payload.accessToken,
         refreshCookie: extractRefreshCookie(response),
         response,
      };
   }

   async function getProfile(accessToken: string) {
      const response = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users/me`)
         .set(authHeaders(accessToken))
         .expect(200);

      return expectOkData<ProfileResponseBody>(response);
   }

   async function getSessions(accessToken: string) {
      const response = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/auth/sessions`)
         .set(authHeaders(accessToken))
         .expect(200);

      return expectOkData<SessionResponseBody[]>(response);
   }

   it('registers a user, returns an access token, and exposes the current session', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);

      expect(registration.response.headers['set-cookie']).toEqual(
         expect.arrayContaining([expect.stringContaining('refreshToken=')]),
      );

      const profile = await getProfile(registration.accessToken);
      expect(profile).toMatchObject({
         email: `user-${suffix}@example.com`,
         login: `user-${suffix}`,
         firstName: 'John',
         lastName: 'Doe',
         age: 32,
         description: 'Created by e2e tests',
      });

      const sessions = await getSessions(registration.accessToken);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
         isCurrent: true,
         userAgent: E2E_USER_AGENT,
         revokedAt: null,
      });
   });

   it('returns a paginated user list and supports profile updates', async () => {
      const firstUser = await registerUser(randomUUID());
      const secondUser = await registerUser(randomUUID());
      const firstProfile = await getProfile(firstUser.accessToken);

      const listResponse = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users`)
         .query({ limit: 1, page: 1, orderBy: 'createdAt', order: 'DESC' })
         .set(authHeaders(firstUser.accessToken))
         .expect(200);

      const listBody = expectOkData<PaginatedUsersResponseBody>(listResponse);
      expect(listBody.meta).toEqual({
         total: 2,
         page: 1,
         limit: 1,
      });
      expect(listBody.items).toHaveLength(1);
      expect(listBody.items[0].login).toMatch(/^user-/);
      expect([firstProfile.login, secondUser.user.login]).toContain(listBody.items[0].login);

      const updateResponse = await request(app.getHttpServer())
         .patch(`${E2E_API_PREFIX}/users/${firstProfile.id}`)
         .set(authHeaders(firstUser.accessToken))
         .send({
            firstName: 'Jane',
            age: 33,
            description: 'Updated by e2e tests',
         })
         .expect(200);

      const updatedProfile = expectOkData<ProfileResponseBody>(updateResponse);
      expect(updatedProfile).toMatchObject({
         id: firstProfile.id,
         firstName: 'Jane',
         age: 33,
         description: 'Updated by e2e tests',
      });

      const reloadedProfile = await getProfile(firstUser.accessToken);
      expect(reloadedProfile).toMatchObject({
         firstName: 'Jane',
         age: 33,
         description: 'Updated by e2e tests',
      });
   });

   it('rejects malformed registration payloads and duplicate credentials', async () => {
      const suffix = randomUUID();
      await registerUser(suffix);

      const invalidResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/register`)
         .set('User-Agent', E2E_USER_AGENT)
         .send({
            login: 'ab',
            email: 'not-an-email',
            password: 'short',
         })
         .expect(400);

      expectErrorResponse(invalidResponse);
      expect(invalidResponse.body.error).toMatchObject({
         code: 'BadRequestException',
      });

      const duplicateResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/register`)
         .set('User-Agent', E2E_USER_AGENT)
         .send({
            ...createUserPayload(suffix, {
               email: `user-${suffix}-duplicate@example.com`,
            }),
         })
         .expect(409);

      expectErrorResponse(duplicateResponse);
      expect(duplicateResponse.body.error).toMatchObject({
         code: 'ALREADY_EXISTS',
         field: 'login',
      });
   });

   it('rejects invalid credentials and missing bearer tokens', async () => {
      const suffix = randomUUID();
      await registerUser(suffix);

      const loginResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/login`)
         .set('User-Agent', E2E_USER_AGENT)
         .send(
            createLoginPayload(suffix, {
               password: 'wrong-password',
            }),
         )
         .expect(401);

      expectErrorResponse(loginResponse);
      expect(loginResponse.body.error).toMatchObject({
         code: 'UnauthorizedException',
         message: 'Invalid credentials',
      });

      const unauthorizedResponse = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users/me`)
         .expect(401);

      expectErrorResponse(unauthorizedResponse);
      expect(unauthorizedResponse.body.error).toMatchObject({
         code: 'UnauthorizedException',
         message: 'Access token is required',
      });
   });

   it('rejects oversized pagination limits for the users list', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);

      const response = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users`)
         .query({ limit: 101 })
         .set(authHeaders(registration.accessToken))
         .expect(400);

      expectErrorResponse(response);
      expect(response.body.error).toMatchObject({
         code: 'BadRequestException',
      });
   });

   it('prevents one authenticated user from updating or deleting another user', async () => {
      const firstUser = await registerUser(randomUUID());
      const secondUser = await registerUser(randomUUID());
      const secondProfile = await getProfile(secondUser.accessToken);

      const updateResponse = await request(app.getHttpServer())
         .patch(`${E2E_API_PREFIX}/users/${secondProfile.id}`)
         .set(authHeaders(firstUser.accessToken))
         .send({
            firstName: 'Mallory',
         })
         .expect(403);

      expectErrorResponse(updateResponse);
      expect(updateResponse.body.error).toMatchObject({
         code: 'ForbiddenException',
         message: 'You can only manage your own user profile',
      });

      const deleteResponse = await request(app.getHttpServer())
         .delete(`${E2E_API_PREFIX}/users/${secondProfile.id}`)
         .set(authHeaders(firstUser.accessToken))
         .expect(403);

      expectErrorResponse(deleteResponse);
      expect(deleteResponse.body.error).toMatchObject({
         code: 'ForbiddenException',
         message: 'You can only manage your own user profile',
      });
   });

   it('returns 429 for repeated login attempts from the same IP even when identities rotate', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
         const response = await request(app.getHttpServer())
            .post(`${E2E_API_PREFIX}/auth/login`)
            .set('User-Agent', E2E_USER_AGENT)
            .send({
               login: `missing-user-${attempt}`,
               password: 'wrong-password',
            })
            .expect(401);

         expectErrorResponse(response);
      }

      const throttledResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/login`)
         .set('User-Agent', E2E_USER_AGENT)
         .send({
            login: 'missing-user-over-limit',
            password: 'wrong-password',
         })
         .expect(429);

      expectErrorResponse(throttledResponse);
      expect(throttledResponse.body.error).toMatchObject({
         code: 'ThrottlerException',
      });
   });

   it('rotates refresh tokens and rejects replay of the old cookie', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);
      const oldRefreshCookie = registration.refreshCookie;

      const refreshResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(oldRefreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(201);

      const refreshedTokens = expectOkData<AuthResponseBody>(refreshResponse);
      const newRefreshCookie = extractRefreshCookie(refreshResponse);

      expect(refreshedTokens.accessToken).toEqual(expect.any(String));
      expect(newRefreshCookie).not.toBe(oldRefreshCookie);

      const replayResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(oldRefreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(401);

      expectErrorResponse(replayResponse);
      expect(replayResponse.body.error).toMatchObject({
         code: 'UnauthorizedException',
         message: 'Refresh session is invalid or expired',
      });

      const secondRefreshResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(newRefreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(201);

      expectOkData<AuthResponseBody>(secondRefreshResponse);
   });

   it('logs out the current session and clears the refresh cookie', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);

      const response = await request(app.getHttpServer())
         .delete(`${E2E_API_PREFIX}/auth/sessions/current`)
         .set(authHeaders(registration.accessToken))
         .expect(200);

      expectOkData<boolean>(response);
      expect(response.headers['set-cookie']).toEqual(
         expect.arrayContaining([expect.stringContaining('refreshToken=;')]),
      );

      const refreshResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(registration.refreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(401);

      expectErrorResponse(refreshResponse);
      expect(refreshResponse.body.error).toMatchObject({
         code: 'UnauthorizedException',
         message: 'Refresh session is invalid or expired',
      });
   });

   it('logs out all sessions for the same user', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);
      const login = await loginUser(suffix);

      const sessionsBeforeLogout = await getSessions(login.accessToken);
      expect(sessionsBeforeLogout).toHaveLength(2);
      expect(sessionsBeforeLogout.some((session) => session.isCurrent)).toBe(true);

      const response = await request(app.getHttpServer())
         .delete(`${E2E_API_PREFIX}/auth/sessions`)
         .set(authHeaders(login.accessToken))
         .set('Cookie', buildCookieHeader(login.refreshCookie))
         .expect(200);

      expectOkData<boolean>(response);

      const oldRefreshResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(registration.refreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(401);

      expectErrorResponse(oldRefreshResponse);

      const loginRefreshResponse = await request(app.getHttpServer())
         .post(`${E2E_API_PREFIX}/auth/refresh`)
         .set('Cookie', buildCookieHeader(login.refreshCookie))
         .set('User-Agent', E2E_USER_AGENT)
         .expect(401);

      expectErrorResponse(loginRefreshResponse);
   });

   it('deletes a user and removes the profile from the active list', async () => {
      const suffix = randomUUID();
      const registration = await registerUser(suffix);
      const profile = await getProfile(registration.accessToken);

      const deleteResponse = await request(app.getHttpServer())
         .delete(`${E2E_API_PREFIX}/users/${profile.id}`)
         .set(authHeaders(registration.accessToken))
         .expect(200);

      expectOkData<boolean>(deleteResponse);

      const missingProfileResponse = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users/me`)
         .set(authHeaders(registration.accessToken))
         .expect(404);

      expectErrorResponse(missingProfileResponse);
      expect(missingProfileResponse.body.error).toMatchObject({
         code: 'ENTITY_NOT_FOUND',
         message: expect.stringContaining('not found'),
      });

      const listResponse = await request(app.getHttpServer())
         .get(`${E2E_API_PREFIX}/users`)
         .set(authHeaders(registration.accessToken))
         .expect(200);

      const listBody = expectOkData<PaginatedUsersResponseBody>(listResponse);
      expect(listBody.meta.total).toBe(0);
      expect(listBody.items).toHaveLength(0);
   });
});
