export interface PaginatedResponse<TItem> {
  items: TItem[];
  totalCount: number;
}

export interface MutationResponse<TData> {
  success: true;
  message: string;
  data: TData;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}
