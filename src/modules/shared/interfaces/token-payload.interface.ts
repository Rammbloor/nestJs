export interface TokenPayload {
   id: string;
   sid?: string;
   email?: string;
   jti?: string;
   iat?: number;
   exp?: number;
}
