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

describe('AuthController throttling metadata', () => {
   it('sets explicit throttling windows for register, login and refresh', () => {
      expect(getThrottleLimit('register')).toBe(AUTH_THROTTLE_RULES.register.limit);
      expect(getThrottleTtl('register')).toBe(AUTH_THROTTLE_RULES.register.ttl);

      expect(getThrottleLimit('login')).toBe(AUTH_THROTTLE_RULES.login.limit);
      expect(getThrottleTtl('login')).toBe(AUTH_THROTTLE_RULES.login.ttl);

      expect(getThrottleLimit('refresh')).toBe(AUTH_THROTTLE_RULES.refresh.limit);
      expect(getThrottleTtl('refresh')).toBe(AUTH_THROTTLE_RULES.refresh.ttl);

      expect(getThrottleLimit('logout')).toBeUndefined();
      expect(getThrottleLimit('getSessions')).toBeUndefined();
      expect(getThrottleLimit('logoutCurrentSession')).toBeUndefined();
      expect(getThrottleLimit('logoutAllSessions')).toBeUndefined();
   });
});
