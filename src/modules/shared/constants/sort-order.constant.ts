export const SortOrderConstant = {
   ASC: 'ASC',
   DESC: 'DESC',
} as const;

export type SortOrderConstant = (typeof SortOrderConstant)[keyof typeof SortOrderConstant];
