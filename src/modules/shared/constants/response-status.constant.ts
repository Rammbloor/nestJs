export const ResponseStatusConstant = {
   OK: 'ok',
   ERROR: 'error',
} as const;

export type ResponseStatusConstant =
   (typeof ResponseStatusConstant)[keyof typeof ResponseStatusConstant];
