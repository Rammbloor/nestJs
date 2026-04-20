export interface IAppExceptionPayload {
   message?: string | string[];
   code?: string | string[];
   object?: string;
   field?: string;
   fields?: string[];
   currentStatus?: string;
   expectedStatuses?: string[];
}
