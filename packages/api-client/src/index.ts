import type {
  ActivateDevelopmentPlanVersionRequest,
  CreateDevelopmentPlanRequest,
  CreateAcceptanceCriterionRequest,
  CreateEpicRequest,
  CreateProjectRequest,
  CreateWorkItemCommentRequest,
  CreateWorkItemRequest,
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
  KanbanBoardCounts,
  KanbanBoardResponse,
  MutationResponse,
  PaginatedResponse,
  PlanningHierarchyResponse,
  ProductSpecResponse,
  ProjectDetail,
  ProjectListFilters,
  ProjectListItem,
  ProjectQueueLimits,
  ProjectQueueLimitsSettingsResponse,
  ProjectRepositoryConfigResponse,
  ProjectRepositoryInput,
  ProjectRepositoryValidationResponse,
  ProjectStatusResponse,
  SystemQueueLimitsResponse,
  TransitionWorkItemRequest,
  UpdateAcceptanceCriterionRequest,
  UpdateDevelopmentPlanRequest,
  UpdateEpicRequest,
  UpdateProjectRequest,
  UpdateWorkItemDependenciesRequest,
  UpdateWorkItemPriorityRequest,
  UpdateWorkItemRequest,
  UpsertProductSpecRequest,
  WorkItemAuditTrailResponse,
  WorkItemCommentsResponse,
  WorkItemDetailResponse,
} from '@repo/shared';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  public constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const defaultApiBaseUrl = 'http://localhost:3000/api/v1';

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

export const getApiBaseUrl = (): string => {
  const fromEnvironment =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;

  return trimTrailingSlash(fromEnvironment ?? defaultApiBaseUrl);
};

const buildUrl = (path: string, searchParams?: URLSearchParams): string => {
  const url = `${getApiBaseUrl()}${path}`;

  if (!searchParams || [...searchParams.keys()].length === 0) {
    return url;
  }

  return `${url}?${searchParams.toString()}`;
};

async function fetchJson<TResponse>(
  path: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
): Promise<TResponse> {
  const response = await fetch(buildUrl(path, searchParams), {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let payload: unknown = undefined;
    let message = `Request failed with status ${response.status}`;

    try {
      payload = await response.json();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        typeof payload.message === 'string'
      ) {
        message = payload.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new ApiClientError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (filters?: ProjectListFilters) =>
    ['projects', 'list', filters ?? {}] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  queueLimits: (projectId: string) =>
    ['projects', projectId, 'queue-limits'] as const,
  repository: (projectId: string) =>
    ['projects', 'repository', projectId] as const,
  status: (projectId: string) => ['projects', 'status', projectId] as const,
  productSpec: (projectId: string) =>
    ['projects', projectId, 'product-spec'] as const,
  developmentPlan: (projectId: string) =>
    ['projects', projectId, 'development-plan'] as const,
  developmentPlanVersions: (projectId: string) =>
    ['projects', projectId, 'development-plan-versions'] as const,
  planningHierarchy: (projectId: string) =>
    ['projects', projectId, 'planning-hierarchy'] as const,
  board: (projectId: string) => ['projects', projectId, 'board'] as const,
  boardCounts: (projectId: string) =>
    ['projects', projectId, 'board-counts'] as const,
  workItemDetail: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-detail', workItemId] as const,
  workItemComments: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-comments', workItemId] as const,
  workItemAudit: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-audit', workItemId] as const,
};

export const settingsQueryKeys = {
  all: ['settings'] as const,
  systemQueueLimits: () => ['settings', 'queue-limits', 'defaults'] as const,
};

export const listProjects = async (
  filters?: ProjectListFilters,
): Promise<PaginatedResponse<ProjectListItem>> => {
  const searchParams = new URLSearchParams();

  if (filters?.query) {
    searchParams.set('query', filters.query);
  }

  if (filters?.lifecycleStatus) {
    searchParams.set('lifecycleStatus', filters.lifecycleStatus);
  }

  return fetchJson<PaginatedResponse<ProjectListItem>>(
    '/projects',
    {
      method: 'GET',
    },
    searchParams,
  );
};

export const getProjectDetail = async (
  projectId: string,
): Promise<ProjectDetail> => {
  return fetchJson<ProjectDetail>(`/projects/${projectId}`, {
    method: 'GET',
  });
};

export const getProjectStatus = async (
  projectId: string,
): Promise<ProjectStatusResponse> => {
  return fetchJson<ProjectStatusResponse>(`/projects/${projectId}/status`, {
    method: 'GET',
  });
};

export const getProjectRepository = async (
  projectId: string,
): Promise<ProjectRepositoryConfigResponse> => {
  return fetchJson<ProjectRepositoryConfigResponse>(
    `/projects/${projectId}/repository`,
    {
      method: 'GET',
    },
  );
};

export const getProjectQueueLimits = async (
  projectId: string,
): Promise<ProjectQueueLimitsSettingsResponse> => {
  return fetchJson<ProjectQueueLimitsSettingsResponse>(
    `/projects/${projectId}/queue-limits`,
    {
      method: 'GET',
    },
  );
};

export const updateProjectQueueLimits = async (
  projectId: string,
  payload: ProjectQueueLimits,
): Promise<MutationResponse<ProjectQueueLimitsSettingsResponse>> => {
  return fetchJson<MutationResponse<ProjectQueueLimitsSettingsResponse>>(
    `/projects/${projectId}/queue-limits`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const clearProjectQueueLimits = async (
  projectId: string,
): Promise<MutationResponse<ProjectQueueLimitsSettingsResponse>> => {
  return fetchJson<MutationResponse<ProjectQueueLimitsSettingsResponse>>(
    `/projects/${projectId}/queue-limits`,
    {
      method: 'DELETE',
    },
  );
};

export const getSystemQueueLimits = async (): Promise<SystemQueueLimitsResponse> => {
  return fetchJson<SystemQueueLimitsResponse>('/settings/queue-limits/defaults', {
    method: 'GET',
  });
};

export const updateSystemQueueLimits = async (
  payload: ProjectQueueLimits,
): Promise<MutationResponse<SystemQueueLimitsResponse>> => {
  return fetchJson<MutationResponse<SystemQueueLimitsResponse>>(
    '/settings/queue-limits/defaults',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const updateProjectRepository = async (
  projectId: string,
  payload: ProjectRepositoryInput,
): Promise<MutationResponse<ProjectRepositoryConfigResponse>> => {
  return fetchJson<MutationResponse<ProjectRepositoryConfigResponse>>(
    `/projects/${projectId}/repository`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const validateProjectRepository = async (
  payload: ProjectRepositoryInput,
): Promise<ProjectRepositoryValidationResponse> => {
  return fetchJson<ProjectRepositoryValidationResponse>(
    '/projects/repository/validate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createProject = async (
  payload: CreateProjectRequest,
): Promise<MutationResponse<ProjectDetail>> => {
  return fetchJson<MutationResponse<ProjectDetail>>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateProject = async (
  projectId: string,
  payload: UpdateProjectRequest,
): Promise<MutationResponse<ProjectDetail>> => {
  return fetchJson<MutationResponse<ProjectDetail>>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const startProject = async (
  projectId: string,
): Promise<MutationResponse<ProjectStatusResponse>> => {
  return fetchJson<MutationResponse<ProjectStatusResponse>>(
    `/projects/${projectId}/start`,
    {
      method: 'POST',
    },
  );
};

export const stopProject = async (
  projectId: string,
): Promise<MutationResponse<ProjectStatusResponse>> => {
  return fetchJson<MutationResponse<ProjectStatusResponse>>(
    `/projects/${projectId}/stop`,
    {
      method: 'POST',
    },
  );
};

export const getProductSpec = async (
  projectId: string,
): Promise<ProductSpecResponse> => {
  return fetchJson<ProductSpecResponse>(`/projects/${projectId}/product-spec`, {
    method: 'GET',
  });
};

export const upsertProductSpec = async (
  projectId: string,
  payload: UpsertProductSpecRequest,
): Promise<MutationResponse<ProductSpecResponse>> => {
  return fetchJson<MutationResponse<ProductSpecResponse>>(
    `/projects/${projectId}/product-spec`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const getDevelopmentPlan = async (
  projectId: string,
): Promise<DevelopmentPlanResponse> => {
  return fetchJson<DevelopmentPlanResponse>(
    `/projects/${projectId}/development-plan`,
    {
      method: 'GET',
    },
  );
};

export const createDevelopmentPlan = async (
  projectId: string,
  payload: CreateDevelopmentPlanRequest,
): Promise<MutationResponse<DevelopmentPlanResponse>> => {
  return fetchJson<MutationResponse<DevelopmentPlanResponse>>(
    `/projects/${projectId}/development-plan`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const updateDevelopmentPlan = async (
  projectId: string,
  payload: UpdateDevelopmentPlanRequest,
): Promise<MutationResponse<DevelopmentPlanResponse>> => {
  return fetchJson<MutationResponse<DevelopmentPlanResponse>>(
    `/projects/${projectId}/development-plan`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
};

export const listDevelopmentPlanVersions = async (
  projectId: string,
): Promise<DevelopmentPlanVersionsResponse> => {
  return fetchJson<DevelopmentPlanVersionsResponse>(
    `/projects/${projectId}/development-plan/versions`,
    {
      method: 'GET',
    },
  );
};

export const activateDevelopmentPlanVersion = async (
  projectId: string,
  payload: ActivateDevelopmentPlanVersionRequest,
): Promise<MutationResponse<DevelopmentPlanResponse>> => {
  return fetchJson<MutationResponse<DevelopmentPlanResponse>>(
    `/projects/${projectId}/development-plan/versions/activate`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getPlanningHierarchy = async (
  projectId: string,
): Promise<PlanningHierarchyResponse> => {
  return fetchJson<PlanningHierarchyResponse>(
    `/projects/${projectId}/planning/hierarchy`,
    {
      method: 'GET',
    },
  );
};

export const createEpic = async (
  projectId: string,
  payload: CreateEpicRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/epics`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const updateEpic = async (
  projectId: string,
  epicId: string,
  payload: UpdateEpicRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/epics/${epicId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
};

export const deleteEpic = async (
  projectId: string,
  epicId: string,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/epics/${epicId}`,
    {
      method: 'DELETE',
    },
  );
};

export const createWorkItem = async (
  projectId: string,
  payload: CreateWorkItemRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const updateWorkItem = async (
  projectId: string,
  workItemId: string,
  payload: UpdateWorkItemRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items/${workItemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
};

export const deleteWorkItem = async (
  projectId: string,
  workItemId: string,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items/${workItemId}`,
    {
      method: 'DELETE',
    },
  );
};

export const updateWorkItemPriority = async (
  projectId: string,
  workItemId: string,
  payload: UpdateWorkItemPriorityRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items/${workItemId}/priority`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const updateWorkItemDependencies = async (
  projectId: string,
  workItemId: string,
  payload: UpdateWorkItemDependenciesRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items/${workItemId}/dependencies`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const createAcceptanceCriterion = async (
  projectId: string,
  workItemId: string,
  payload: CreateAcceptanceCriterionRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/work-items/${workItemId}/acceptance-criteria`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const updateAcceptanceCriterion = async (
  projectId: string,
  criterionId: string,
  payload: UpdateAcceptanceCriterionRequest,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/acceptance-criteria/${criterionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
};

export const deleteAcceptanceCriterion = async (
  projectId: string,
  criterionId: string,
): Promise<MutationResponse<PlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<PlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/acceptance-criteria/${criterionId}`,
    {
      method: 'DELETE',
    },
  );
};

export const getBoard = async (
  projectId: string,
): Promise<KanbanBoardResponse> => {
  return fetchJson<KanbanBoardResponse>(`/projects/${projectId}/board`, {
    method: 'GET',
  });
};

export const getBoardCounts = async (
  projectId: string,
): Promise<KanbanBoardCounts> => {
  return fetchJson<KanbanBoardCounts>(`/projects/${projectId}/board/counts`, {
    method: 'GET',
  });
};

export const transitionWorkItem = async (
  projectId: string,
  workItemId: string,
  payload: TransitionWorkItemRequest,
): Promise<MutationResponse<KanbanBoardResponse>> => {
  return fetchJson<MutationResponse<KanbanBoardResponse>>(
    `/projects/${projectId}/work-items/${workItemId}/transition`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getWorkItemDetail = async (
  projectId: string,
  workItemId: string,
): Promise<WorkItemDetailResponse> => {
  return fetchJson<WorkItemDetailResponse>(
    `/projects/${projectId}/work-items/${workItemId}`,
    {
      method: 'GET',
    },
  );
};

export const getWorkItemComments = async (
  projectId: string,
  workItemId: string,
): Promise<WorkItemCommentsResponse> => {
  return fetchJson<WorkItemCommentsResponse>(
    `/projects/${projectId}/work-items/${workItemId}/comments`,
    {
      method: 'GET',
    },
  );
};

export const createWorkItemComment = async (
  projectId: string,
  workItemId: string,
  payload: CreateWorkItemCommentRequest,
): Promise<MutationResponse<WorkItemCommentsResponse>> => {
  return fetchJson<MutationResponse<WorkItemCommentsResponse>>(
    `/projects/${projectId}/work-items/${workItemId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getWorkItemAuditTrail = async (
  projectId: string,
  workItemId: string,
): Promise<WorkItemAuditTrailResponse> => {
  return fetchJson<WorkItemAuditTrailResponse>(
    `/projects/${projectId}/work-items/${workItemId}/audit`,
    {
      method: 'GET',
    },
  );
};
