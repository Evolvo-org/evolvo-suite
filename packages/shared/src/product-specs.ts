export interface ProductSpecResponse {
  projectId: string;
  productSpecId: string | null;
  content: string | null;
  version: number | null;
  updatedAt: string | null;
}

export interface UpsertProductSpecRequest {
  content: string;
}
