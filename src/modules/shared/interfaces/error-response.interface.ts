export interface IErrorDebugDetails {
   name?: string;
   object?: string;
   currentStatus?: string;
   expectedStatuses?: string[];
   path?: string;
   method?: string;
   params?: unknown;
   query?: unknown;
}

export interface IErrorDetails {
   code?: string;
   message: string;
   field?: string;
   fields?: string[];
   debug?: IErrorDebugDetails;
}
