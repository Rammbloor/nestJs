import argon2 from 'argon2';

const ARGON2_OPTIONS = {
   type: argon2.argon2id,
   memoryCost: 64 * 1024,
   timeCost: 3,
   parallelism: 4,
};

export async function hash(plainPassword: string): Promise<string> {
   return await argon2.hash(plainPassword, ARGON2_OPTIONS);
}

export async function verify(plainPassword: string, storedHash: string): Promise<boolean> {
   return await argon2.verify(storedHash, plainPassword);
}
