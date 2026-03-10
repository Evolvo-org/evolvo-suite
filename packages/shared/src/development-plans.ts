export interface PlanningApprovalStatus {
  approvedAt: string | null;
  approvedBy: string | null;
  approvedVersionId: string | null;
  summary: string | null;
  isApproved: boolean;
}

export interface DevelopmentPlanApprovalAuditItem {
  id: string;
  planVersionId: string;
  planVersionNumber: number | null;
  actorName: string;
  summary: string | null;
  action: 'approved' | 'reset';
  createdAt: string;
}

export interface DevelopmentPlanApprovalAuditResponse {
  projectId: string;
  planId: string | null;
  items: DevelopmentPlanApprovalAuditItem[];
}

export interface DevelopmentPlanResponse {
  projectId: string;
  planId: string | null;
  title: string | null;
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  activeContent: string | null;
  versionCount: number;
  planningApproval: PlanningApprovalStatus;
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
  planningApproval: PlanningApprovalStatus;
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

export interface ApproveDevelopmentPlanRequest {
  actorName: string;
  summary?: string;
}
