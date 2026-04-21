import { AUTH_THROTTLE_RULES } from '@infra/throttler';
import { AuthController } from '@/modules/api/v1/auth/auth.controller';

const THROTTLER_LIMIT_METADATA = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_METADATA = 'THROTTLER:TTLdefault';

function getThrottleLimit(methodName: keyof AuthController) {
   return Reflect.getMetadata(THROTTLER_LIMIT_METADATA, AuthController.prototype[methodName]);
}

function getThrottleTtl(methodName: keyof AuthController) {
   return Reflect.getMetadata(THROTTLER_TTL_METADATA, AuthController.prototype[methodName]);
}

function resolveThrottleValue(value: number | (() => number)): number {
   return typeof value === 'function' ? value() : value;
}

describe('AuthController throttling metadata', () => {
   const originalEnv = { ...process.env };

   afterEach(() => {
      process.env = { ...originalEnv };
   });

   it('sets explicit throttling windows for register, login and refresh', () => {
      expect(resolveThrottleValue(getThrottleLimit('register'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.register.limit),
      );
      expect(resolveThrottleValue(getThrottleTtl('register'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.register.ttl),
      );

      expect(resolveThrottleValue(getThrottleLimit('login'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.login.limit),
      );
      expect(resolveThrottleValue(getThrottleTtl('login'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.login.ttl),
      );

      expect(resolveThrottleValue(getThrottleLimit('refresh'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.refresh.limit),
      );
      expect(resolveThrottleValue(getThrottleTtl('refresh'))).toBe(
         resolveThrottleValue(AUTH_THROTTLE_RULES.refresh.ttl),
      );

      expect(getThrottleLimit('logout')).toBeUndefined();
      expect(getThrottleLimit('getSessions')).toBeUndefined();
      expect(getThrottleLimit('logoutCurrentSession')).toBeUndefined();
      expect(getThrottleLimit('logoutAllSessions')).toBeUndefined();
   });

   it('resolves auth throttling values from environment variables', () => {
      process.env.AUTH_LOGIN_THROTTLE_LIMIT = '9';
      process.env.AUTH_LOGIN_THROTTLE_TTL = '120';

      expect(resolveThrottleValue(getThrottleLimit('login'))).toBe(9);
      expect(resolveThrottleValue(getThrottleTtl('login'))).toBe(120_000);
   });
});
