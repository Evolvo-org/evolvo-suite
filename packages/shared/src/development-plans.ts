export interface DevelopmentPlanResponse {
  projectId: string;
  planId: string | null;
  title: string | null;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  activeContent: string | null;
  versionCount: number;
  updatedAt: string | null;
}

export interface DevelopmentPlanVersionItem {
  id: string;
  versionNumber: number;
  title: string;
  summary: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface DevelopmentPlanVersionsResponse {
  projectId: string;
  planId: string | null;
  activeVersionId: string | null;
  versions: DevelopmentPlanVersionItem[];
}

export interface CreateDevelopmentPlanRequest {
  title: string;
  content: string;
}

export interface UpdateDevelopmentPlanRequest {
  title?: string;
  content: string;
  summary?: string;
  activate?: boolean;
}

export interface ActivateDevelopmentPlanVersionRequest {
  versionId: string;
}
