export const EnvironmentConstant = {
   TEST: 'test',
   DEVELOPMENT: 'dev',
   PRODUCTION: 'prod',
} as const;
export type EnvironmentConstant = (typeof EnvironmentConstant)[keyof typeof EnvironmentConstant];
