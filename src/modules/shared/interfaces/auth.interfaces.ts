import { AuthTokenPair } from '@shared/interfaces';

export interface AuthSessionResult extends AuthTokenPair {
   refreshTokenExpiresAt: Date;
}

export interface SessionMetadata {
   ipAddress: string | null;
   userAgent: string | null;
}
