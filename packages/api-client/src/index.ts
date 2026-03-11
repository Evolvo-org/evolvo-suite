import type {
  ActivateDevelopmentPlanVersionRequest,
  AgentRunListResponse,
  AgentRunRecord,
  AgentRoutingConfig,
  ApproveDevelopmentPlanRequest,
  AutomationActionRecord,
  AcquireSchedulerLeaseRequest,
  AcquireSchedulerLeaseResponse,
  CurrentUserResponse,
  CreateAgentArtifactRequest,
  CreateAgentDecisionRequest,
  CreateAgentFailureRequest,
  CreateAgentRunRequest,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  CreateDevelopmentPlanRequest,
  CreateAcceptanceCriterionRequest,
  CreateEpicRequest,
  CreateProjectRequest,
  CreateBillingPortalSessionRequest,
  CreateHumanInterventionRequest,
  CreateReleaseRunRequest,
  CreateReleaseVersionRequest,
  CreateUsageEventRequest,
  BillingPortalSessionResponse,
  BillingStatusResponse,
  BillingSubscriptionRecord,
  StripeCustomerMappingRecord,
  CreateWorkItemCommentRequest,
  CreateWorkItemRequest,
  DevelopmentPlanApprovalAuditResponse,
  DevelopmentPlanResponse,
  DevelopmentPlanVersionsResponse,
  ExecutePlanningRequest,
  ExecutePlanningResponse,
  ExpandPlanningHierarchyResponse,
  ExecuteDevTaskRequest,
  ExecuteDevTaskResponse,
  ExecuteReleaseRequest,
  ExecuteReleaseResponse,
  ExecuteReviewRequest,
  ExecuteReviewResponse,
  HumanInterventionCaseRecord,
  HumanInterventionListResponse,
  KanbanBoardCounts,
  KanbanBoardResponse,
  MutationResponse,
  ManagementCommandCompleteRequest,
  ManagementCommandFailRequest,
  ManagementCommandProgressRequest,
  ManagementCommandRecord,
  ProjectObservabilityMetricsResponse,
  PaginatedResponse,
  PlanningHierarchyResponse,
  ProductSpecResponse,
  ProjectAgentRoutingSettingsResponse,
  ProjectDetail,
  ProjectListFilters,
  ProjectListItem,
  ProjectQueueLimits,
  ProjectQueueLimitsSettingsResponse,
  ProjectRepositoryConfigResponse,
  ProjectRepositoryInput,
  ProjectRepositoryValidationResponse,
  ProjectStatusResponse,
  RunProjectAutomationRequest,
  RunProjectAutomationResponse,
  RecordReleaseResultRequest,
  RegisterRuntimeRequest,
  RecoverSchedulerLeasesRequest,
  RecoverSchedulerLeasesResponse,
  ResolveHumanInterventionRequest,
  CreateReviewGateResultRequest,
  RequestRuntimeWorkRequest,
  ReleaseHistoryResponse,
  ReleaseRunRecord,
  RetryHumanInterventionRequest,
  ReviewGateListResponse,
  ReviewGateResultRecord,
  ReviewGateSummaryResponse,
  UsageEventRecord,
  UsageSummaryResponse,
  RuntimeArtifactUploadMetadataRequest,
  RuntimeArtifactUploadMetadataResponse,
  RuntimeDashboardResponse,
  RuntimeDetailResponse,
  RuntimeHeartbeatRequest,
  RuntimeJobResultRequest,
  RuntimeJobResultResponse,
  RuntimeProgressUpdateRequest,
  StripeWebhookEventRequest,
  RuntimeWorkDispatchResponse,
  RenewSchedulerLeaseRequest,
  SchedulerLease,
  SchedulerStateResponse,
  StructuredLogListResponse,
  StructuredLogQuery,
  SystemAgentRoutingResponse,
  SystemQueueLimitsResponse,
  TransitionWorkItemRequest,
  UpdateAcceptanceCriterionRequest,
  UpdateDevelopmentPlanRequest,
  UpdateEpicRequest,
  UpdateProjectRequest,
  UpsertReleaseNoteRequest,
  UpdateWorkItemDependenciesRequest,
  UpdateWorkItemPriorityRequest,
  UpdateWorkItemRequest,
  UpsertProductSpecRequest,
  UpsertPromptSnapshotRequest,
  UpsertBillingSubscriptionRequest,
  UpsertStripeCustomerMappingRequest,
  UpsertWorktreeRequest,
  WorktreeListResponse,
  WorktreeResponse,
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

type ApiClientHeaders = HeadersInit | (() => HeadersInit | undefined);

export interface ApiClientConfiguration {
  baseUrl?: string;
  defaultHeaders?: ApiClientHeaders;
  fetchImplementation?: typeof fetch;
}

let apiClientConfiguration: ApiClientConfiguration = {};

const defaultApiBaseUrl = 'http://localhost:3000/api/v1';

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const appendHeaders = (target: Headers, headers?: HeadersInit): void => {
  if (!headers) {
    return;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      target.set(key, value);
    });
    return;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      target.set(key, value);
    }
    return;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      target.set(key, value);
    }
  }
};

const resolveDefaultHeaders = (): HeadersInit | undefined => {
  const { defaultHeaders } = apiClientConfiguration;

  if (typeof defaultHeaders === 'function') {
    return defaultHeaders();
  }

  return defaultHeaders;
};

export const configureApiClient = (
  configuration: ApiClientConfiguration,
): void => {
  apiClientConfiguration = {
    ...apiClientConfiguration,
    ...configuration,
  };
};

export const resetApiClientConfiguration = (): void => {
  apiClientConfiguration = {};
};

export const getApiBaseUrl = (): string => {
  if (apiClientConfiguration.baseUrl?.trim()) {
    return trimTrailingSlash(apiClientConfiguration.baseUrl);
  }

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
  const headers = new Headers();
  appendHeaders(headers, resolveDefaultHeaders());
  appendHeaders(headers, {
    'content-type': 'application/json',
  });
  appendHeaders(headers, init?.headers);

  const response = await (apiClientConfiguration.fetchImplementation ?? fetch)(
    buildUrl(path, searchParams),
    {
    credentials: 'include',
      ...init,
      headers,
    },
  );

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
  runtimeDashboard: (projectId: string) =>
    ['projects', projectId, 'runtime-dashboard'] as const,
  observabilityMetrics: (projectId: string) =>
    ['projects', projectId, 'observability-metrics'] as const,
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
  developmentPlanApprovals: (projectId: string) =>
    ['projects', projectId, 'development-plan-approvals'] as const,
  planningHierarchy: (projectId: string) =>
    ['projects', projectId, 'planning-hierarchy'] as const,
  board: (projectId: string) => ['projects', projectId, 'board'] as const,
  boardCounts: (projectId: string) =>
    ['projects', projectId, 'board-counts'] as const,
  worktrees: (projectId: string) => ['projects', projectId, 'worktrees'] as const,
  worktree: (projectId: string, worktreeId: string) =>
    ['projects', projectId, 'worktrees', worktreeId] as const,
  workItemDetail: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-detail', workItemId] as const,
  workItemComments: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-comments', workItemId] as const,
  workItemTimeline: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-timeline', workItemId] as const,
  workItemAudit: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-audit', workItemId] as const,
  workItemReviewGates: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-review-gates', workItemId] as const,
  workItemReviewGateSummary: (projectId: string, workItemId: string) =>
    ['projects', projectId, 'work-item-review-gate-summary', workItemId] as const,
  releases: (projectId: string) => ['projects', projectId, 'releases'] as const,
  interventions: (projectId: string) => ['projects', projectId, 'interventions'] as const,
  usageSummary: (
    projectId: string,
    filters?: { from?: string; to?: string },
  ) => ['projects', projectId, 'usage-summary', filters ?? {}] as const,
  userUsageSummary: (
    userId: string,
    filters?: { from?: string; to?: string },
  ) => ['usage', 'users', userId, 'summary', filters ?? {}] as const,
  logs: (projectId: string, filters?: StructuredLogQuery) =>
    ['projects', projectId, 'logs', filters ?? {}] as const,
  systemLogs: (filters?: StructuredLogQuery) => ['logs', 'system', filters ?? {}] as const,
};

export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
};

export const settingsQueryKeys = {
  all: ['settings'] as const,
  systemQueueLimits: () => ['settings', 'queue-limits', 'defaults'] as const,
};

export const schedulerQueryKeys = {
  all: ['scheduler'] as const,
  state: (projectId?: string) => ['scheduler', 'state', projectId ?? 'all'] as const,
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

export const getRuntimeDashboard = async (
  projectId: string,
): Promise<RuntimeDashboardResponse> => {
  return fetchJson<RuntimeDashboardResponse>(
    `/projects/${projectId}/runtime-dashboard`,
    {
      method: 'GET',
    },
  );
};

export const getProjectObservabilityMetrics = async (
  projectId: string,
): Promise<ProjectObservabilityMetricsResponse> => {
  return fetchJson<ProjectObservabilityMetricsResponse>(
    `/projects/${projectId}/observability/metrics`,
    {
      method: 'GET',
    },
  );
};

export const getProjectStatus = async (
  projectId: string,
): Promise<ProjectStatusResponse> => {
  return fetchJson<ProjectStatusResponse>(`/projects/${projectId}/status`, {
    method: 'GET',
  });
};

export const runProjectAutomation = async (
  projectId: string,
  payload: RunProjectAutomationRequest = {},
): Promise<MutationResponse<RunProjectAutomationResponse>> => {
  return fetchJson<MutationResponse<RunProjectAutomationResponse>>(
    `/projects/${projectId}/automation/run`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
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

export const getProjectAgentRouting = async (
  projectId: string,
): Promise<ProjectAgentRoutingSettingsResponse> => {
  return fetchJson<ProjectAgentRoutingSettingsResponse>(
    `/projects/${projectId}/agent-routing`,
    {
      method: 'GET',
    },
  );
};

export const updateProjectAgentRouting = async (
  projectId: string,
  payload: AgentRoutingConfig,
): Promise<MutationResponse<ProjectAgentRoutingSettingsResponse>> => {
  return fetchJson<MutationResponse<ProjectAgentRoutingSettingsResponse>>(
    `/projects/${projectId}/agent-routing`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const clearProjectAgentRouting = async (
  projectId: string,
): Promise<MutationResponse<ProjectAgentRoutingSettingsResponse>> => {
  return fetchJson<MutationResponse<ProjectAgentRoutingSettingsResponse>>(
    `/projects/${projectId}/agent-routing`,
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

export const getSystemAgentRouting = async (): Promise<SystemAgentRoutingResponse> => {
  return fetchJson<SystemAgentRoutingResponse>('/settings/agent-routing/defaults', {
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

export const updateSystemAgentRouting = async (
  payload: AgentRoutingConfig,
): Promise<MutationResponse<SystemAgentRoutingResponse>> => {
  return fetchJson<MutationResponse<SystemAgentRoutingResponse>>(
    '/settings/agent-routing/defaults',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const acquireSchedulerLease = async (
  payload: AcquireSchedulerLeaseRequest,
): Promise<MutationResponse<AcquireSchedulerLeaseResponse>> => {
  return fetchJson<MutationResponse<AcquireSchedulerLeaseResponse>>(
    '/scheduler/leases/acquire',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const renewSchedulerLease = async (
  leaseId: string,
  payload: RenewSchedulerLeaseRequest,
): Promise<MutationResponse<SchedulerLease>> => {
  return fetchJson<MutationResponse<SchedulerLease>>(
    `/scheduler/leases/${leaseId}/renew`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const recoverSchedulerLeases = async (
  payload: RecoverSchedulerLeasesRequest = {},
): Promise<MutationResponse<RecoverSchedulerLeasesResponse>> => {
  return fetchJson<MutationResponse<RecoverSchedulerLeasesResponse>>(
    '/scheduler/leases/recover',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getSchedulerState = async (
  projectId?: string,
): Promise<SchedulerStateResponse> => {
  const searchParams = new URLSearchParams();

  if (projectId) {
    searchParams.set('projectId', projectId);
  }

  return fetchJson<SchedulerStateResponse>(
    '/scheduler/state',
    {
      method: 'GET',
    },
    searchParams,
  );
};

export const registerRuntime = async (
  payload: RegisterRuntimeRequest,
): Promise<MutationResponse<RuntimeDetailResponse>> => {
  return fetchJson<MutationResponse<RuntimeDetailResponse>>(
    '/runtimes/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const sendRuntimeHeartbeat = async (
  runtimeId: string,
  payload: RuntimeHeartbeatRequest,
): Promise<MutationResponse<RuntimeDetailResponse>> => {
  return fetchJson<MutationResponse<RuntimeDetailResponse>>(
    `/runtimes/${runtimeId}/heartbeat`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getRuntimeDetail = async (
  runtimeId: string,
): Promise<RuntimeDetailResponse> => {
  return fetchJson<RuntimeDetailResponse>(`/runtimes/${runtimeId}`, {
    method: 'GET',
  });
};

export const requestRuntimeWork = async (
  runtimeId: string,
  payload: RequestRuntimeWorkRequest = {},
): Promise<MutationResponse<RuntimeWorkDispatchResponse>> => {
  return fetchJson<MutationResponse<RuntimeWorkDispatchResponse>>(
    `/runtimes/${runtimeId}/request-work`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const claimRuntimeManagementCommand = async (
  runtimeId: string,
): Promise<MutationResponse<ManagementCommandRecord | null>> => {
  return fetchJson<MutationResponse<ManagementCommandRecord | null>>(
    `/runtimes/${runtimeId}/management-commands/claim`,
    {
      method: 'POST',
    },
  );
};

export const sendRuntimeManagementCommandProgress = async (
  runtimeId: string,
  commandId: string,
  payload: ManagementCommandProgressRequest,
): Promise<MutationResponse<ManagementCommandRecord>> => {
  return fetchJson<MutationResponse<ManagementCommandRecord>>(
    `/runtimes/${runtimeId}/management-commands/${commandId}/progress`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const completeRuntimeManagementCommand = async (
  runtimeId: string,
  commandId: string,
  payload: ManagementCommandCompleteRequest,
): Promise<MutationResponse<ManagementCommandRecord>> => {
  return fetchJson<MutationResponse<ManagementCommandRecord>>(
    `/runtimes/${runtimeId}/management-commands/${commandId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const failRuntimeManagementCommand = async (
  runtimeId: string,
  commandId: string,
  payload: ManagementCommandFailRequest,
): Promise<MutationResponse<ManagementCommandRecord>> => {
  return fetchJson<MutationResponse<ManagementCommandRecord>>(
    `/runtimes/${runtimeId}/management-commands/${commandId}/fail`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const sendRuntimeProgress = async (
  runtimeId: string,
  leaseId: string,
  payload: RuntimeProgressUpdateRequest,
): Promise<MutationResponse<SchedulerLease>> => {
  return fetchJson<MutationResponse<SchedulerLease>>(
    `/runtimes/${runtimeId}/leases/${leaseId}/progress`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const submitRuntimeJobResult = async (
  runtimeId: string,
  leaseId: string,
  payload: RuntimeJobResultRequest,
): Promise<MutationResponse<RuntimeJobResultResponse>> => {
  return fetchJson<MutationResponse<RuntimeJobResultResponse>>(
    `/runtimes/${runtimeId}/leases/${leaseId}/result`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createRuntimeArtifactUploadMetadata = async (
  runtimeId: string,
  leaseId: string,
  payload: RuntimeArtifactUploadMetadataRequest,
): Promise<MutationResponse<RuntimeArtifactUploadMetadataResponse>> => {
  return fetchJson<MutationResponse<RuntimeArtifactUploadMetadataResponse>>(
    `/runtimes/${runtimeId}/leases/${leaseId}/artifacts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getProjectWorktrees = async (
  projectId: string,
): Promise<WorktreeListResponse> => {
  return fetchJson<WorktreeListResponse>(`/projects/${projectId}/worktrees`, {
    method: 'GET',
  });
};

export const getProjectWorktree = async (
  projectId: string,
  worktreeId: string,
): Promise<WorktreeResponse> => {
  return fetchJson<WorktreeResponse>(
    `/projects/${projectId}/worktrees/${worktreeId}`,
    {
      method: 'GET',
    },
  );
};

export const upsertProjectWorktree = async (
  projectId: string,
  payload: UpsertWorktreeRequest,
): Promise<MutationResponse<WorktreeResponse>> => {
  return fetchJson<MutationResponse<WorktreeResponse>>(
    `/projects/${projectId}/worktrees`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const requestProjectWorktreeCleanup = async (
  projectId: string,
  worktreeId: string,
  payload: { reason?: string } = {},
): Promise<MutationResponse<WorktreeResponse>> => {
  return fetchJson<MutationResponse<WorktreeResponse>>(
    `/projects/${projectId}/worktrees/${worktreeId}/cleanup`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const markProjectWorktreeStale = async (
  projectId: string,
  worktreeId: string,
  payload: { reason?: string } = {},
): Promise<MutationResponse<WorktreeResponse>> => {
  return fetchJson<MutationResponse<WorktreeResponse>>(
    `/projects/${projectId}/worktrees/${worktreeId}/stale`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const listAgentRuns = async (
  projectId: string,
  workItemId: string,
): Promise<AgentRunListResponse> => {
  return fetchJson<AgentRunListResponse>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs`,
    {
      method: 'GET',
    },
  );
};

export const createAgentRun = async (
  projectId: string,
  workItemId: string,
  payload: CreateAgentRunRequest,
): Promise<MutationResponse<AgentRunRecord>> => {
  return fetchJson<MutationResponse<AgentRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const executePlanning = async (
  projectId: string,
  workItemId: string,
  payload: ExecutePlanningRequest,
): Promise<MutationResponse<ExecutePlanningResponse>> => {
  return fetchJson<MutationResponse<ExecutePlanningResponse>>(
    `/projects/${projectId}/agents/planning/work-items/${workItemId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const executeDevTask = async (
  projectId: string,
  workItemId: string,
  payload: ExecuteDevTaskRequest,
): Promise<MutationResponse<ExecuteDevTaskResponse>> => {
  return fetchJson<MutationResponse<ExecuteDevTaskResponse>>(
    `/projects/${projectId}/agents/dev/work-items/${workItemId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const executeReview = async (
  projectId: string,
  workItemId: string,
  payload: ExecuteReviewRequest,
): Promise<MutationResponse<ExecuteReviewResponse>> => {
  return fetchJson<MutationResponse<ExecuteReviewResponse>>(
    `/projects/${projectId}/agents/review/work-items/${workItemId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const executeRelease = async (
  projectId: string,
  workItemId: string,
  payload: ExecuteReleaseRequest,
): Promise<MutationResponse<ExecuteReleaseResponse>> => {
  return fetchJson<MutationResponse<ExecuteReleaseResponse>>(
    `/projects/${projectId}/agents/release/work-items/${workItemId}/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createAgentDecision = async (
  projectId: string,
  workItemId: string,
  runId: string,
  payload: CreateAgentDecisionRequest,
): Promise<MutationResponse<AgentRunRecord>> => {
  return fetchJson<MutationResponse<AgentRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/decisions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createAgentFailure = async (
  projectId: string,
  workItemId: string,
  runId: string,
  payload: CreateAgentFailureRequest,
): Promise<MutationResponse<AgentRunRecord>> => {
  return fetchJson<MutationResponse<AgentRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/failure`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const upsertPromptSnapshot = async (
  projectId: string,
  workItemId: string,
  runId: string,
  payload: UpsertPromptSnapshotRequest,
): Promise<MutationResponse<AgentRunRecord>> => {
  return fetchJson<MutationResponse<AgentRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/prompt-snapshot`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const createAgentArtifact = async (
  projectId: string,
  workItemId: string,
  runId: string,
  payload: CreateAgentArtifactRequest,
): Promise<MutationResponse<AgentRunRecord>> => {
  return fetchJson<MutationResponse<AgentRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/agent-runs/${runId}/artifacts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const listReviewGateResults = async (
  projectId: string,
  workItemId: string,
): Promise<ReviewGateListResponse> => {
  return fetchJson<ReviewGateListResponse>(
    `/projects/${projectId}/work-items/${workItemId}/review-gates`,
    {
      method: 'GET',
    },
  );
};

export const getReviewGateSummary = async (
  projectId: string,
  workItemId: string,
): Promise<ReviewGateSummaryResponse> => {
  return fetchJson<ReviewGateSummaryResponse>(
    `/projects/${projectId}/work-items/${workItemId}/review-gates/summary`,
    {
      method: 'GET',
    },
  );
};

export const createReviewGateResult = async (
  projectId: string,
  workItemId: string,
  payload: CreateReviewGateResultRequest,
): Promise<MutationResponse<ReviewGateResultRecord>> => {
  return fetchJson<MutationResponse<ReviewGateResultRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/review-gates`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const startReleaseRun = async (
  projectId: string,
  workItemId: string,
  payload: CreateReleaseRunRequest,
): Promise<MutationResponse<ReleaseRunRecord>> => {
  return fetchJson<MutationResponse<ReleaseRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/releases`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const recordReleaseResult = async (
  projectId: string,
  workItemId: string,
  releaseRunId: string,
  payload: RecordReleaseResultRequest,
): Promise<MutationResponse<ReleaseRunRecord>> => {
  return fetchJson<MutationResponse<ReleaseRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/result`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createReleaseVersion = async (
  projectId: string,
  workItemId: string,
  releaseRunId: string,
  payload: CreateReleaseVersionRequest,
): Promise<MutationResponse<ReleaseRunRecord>> => {
  return fetchJson<MutationResponse<ReleaseRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/version`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const upsertReleaseNote = async (
  projectId: string,
  workItemId: string,
  releaseRunId: string,
  payload: UpsertReleaseNoteRequest,
): Promise<MutationResponse<ReleaseRunRecord>> => {
  return fetchJson<MutationResponse<ReleaseRunRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/releases/${releaseRunId}/notes`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const getReleaseHistory = async (
  projectId: string,
): Promise<ReleaseHistoryResponse> => {
  return fetchJson<ReleaseHistoryResponse>(`/projects/${projectId}/releases`, {
    method: 'GET',
  });
};

export const createHumanIntervention = async (
  projectId: string,
  workItemId: string,
  payload: CreateHumanInterventionRequest,
): Promise<MutationResponse<HumanInterventionCaseRecord>> => {
  return fetchJson<MutationResponse<HumanInterventionCaseRecord>>(
    `/projects/${projectId}/work-items/${workItemId}/interventions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const listHumanInterventions = async (
  projectId: string,
): Promise<HumanInterventionListResponse> => {
  return fetchJson<HumanInterventionListResponse>(
    `/projects/${projectId}/interventions`,
    {
      method: 'GET',
    },
  );
};

export const resolveHumanIntervention = async (
  projectId: string,
  interventionId: string,
  payload: ResolveHumanInterventionRequest = {},
): Promise<MutationResponse<HumanInterventionCaseRecord>> => {
  return fetchJson<MutationResponse<HumanInterventionCaseRecord>>(
    `/projects/${projectId}/interventions/${interventionId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const retryHumanIntervention = async (
  projectId: string,
  interventionId: string,
  payload: RetryHumanInterventionRequest,
): Promise<MutationResponse<HumanInterventionCaseRecord>> => {
  return fetchJson<MutationResponse<HumanInterventionCaseRecord>>(
    `/projects/${projectId}/interventions/${interventionId}/retry`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const createUsageEvent = async (
  projectId: string,
  payload: CreateUsageEventRequest,
): Promise<MutationResponse<UsageEventRecord>> => {
  return fetchJson<MutationResponse<UsageEventRecord>>(
    `/projects/${projectId}/usage/events`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const getProjectUsageSummary = async (
  projectId: string,
  filters?: { from?: string; to?: string },
): Promise<UsageSummaryResponse> => {
  const searchParams = new URLSearchParams();

  if (filters?.from) {
    searchParams.set('from', filters.from);
  }

  if (filters?.to) {
    searchParams.set('to', filters.to);
  }

  return fetchJson<UsageSummaryResponse>(
    `/projects/${projectId}/usage/summary`,
    { method: 'GET' },
    searchParams,
  );
};

export const getUserUsageSummary = async (
  userId: string,
  filters?: { from?: string; to?: string },
): Promise<UsageSummaryResponse> => {
  const searchParams = new URLSearchParams();

  if (filters?.from) {
    searchParams.set('from', filters.from);
  }

  if (filters?.to) {
    searchParams.set('to', filters.to);
  }

  return fetchJson<UsageSummaryResponse>(
    `/usage/users/${userId}/summary`,
    { method: 'GET' },
    searchParams,
  );
};

export const upsertStripeCustomerMapping = async (
  payload: UpsertStripeCustomerMappingRequest,
): Promise<MutationResponse<StripeCustomerMappingRecord>> => {
  return fetchJson<MutationResponse<StripeCustomerMappingRecord>>(
    '/billing/customer',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const upsertBillingSubscription = async (
  payload: UpsertBillingSubscriptionRequest,
): Promise<MutationResponse<BillingSubscriptionRecord>> => {
  return fetchJson<MutationResponse<BillingSubscriptionRecord>>(
    '/billing/subscription',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
};

export const getBillingStatus = async (
  workspaceKey?: string,
): Promise<BillingStatusResponse> => {
  const searchParams = new URLSearchParams();

  if (workspaceKey) {
    searchParams.set('workspaceKey', workspaceKey);
  }

  return fetchJson<BillingStatusResponse>(
    '/billing/subscription',
    { method: 'GET' },
    searchParams,
  );
};

export const createBillingPortalSession = async (
  payload: CreateBillingPortalSessionRequest = {},
): Promise<MutationResponse<BillingPortalSessionResponse>> => {
  return fetchJson<MutationResponse<BillingPortalSessionResponse>>(
    '/billing/portal-session',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
};

export const postStripeWebhookEvent = async (
  payload: StripeWebhookEventRequest,
): Promise<MutationResponse<BillingStatusResponse>> => {
  return fetchJson<MutationResponse<BillingStatusResponse>>(
    '/billing/webhooks/stripe',
    {
      method: 'POST',
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

export const login = async (
  payload: LoginRequest,
): Promise<MutationResponse<LoginResponse>> => {
  return fetchJson<MutationResponse<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  return fetchJson<CurrentUserResponse>('/auth/current-user');
};

export const logout = async (): Promise<MutationResponse<LogoutResponse>> => {
  return fetchJson<MutationResponse<LogoutResponse>>('/auth/logout', {
    method: 'POST',
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

export const deleteProject = async (
  projectId: string,
): Promise<MutationResponse<{ projectId: string; name: string }>> => {
  return fetchJson<MutationResponse<{ projectId: string; name: string }>>(
    `/projects/${projectId}`,
    {
      method: 'DELETE',
    },
  );
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

export const listDevelopmentPlanApprovalAudit = async (
  projectId: string,
): Promise<DevelopmentPlanApprovalAuditResponse> => {
  return fetchJson<DevelopmentPlanApprovalAuditResponse>(
    `/projects/${projectId}/development-plan/approvals`,
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

export const approveDevelopmentPlan = async (
  projectId: string,
  payload: ApproveDevelopmentPlanRequest,
): Promise<MutationResponse<DevelopmentPlanResponse>> => {
  return fetchJson<MutationResponse<DevelopmentPlanResponse>>(
    `/projects/${projectId}/development-plan/approve`,
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

export const expandPlanningHierarchy = async (
  projectId: string,
): Promise<MutationResponse<ExpandPlanningHierarchyResponse>> => {
  return fetchJson<MutationResponse<ExpandPlanningHierarchyResponse>>(
    `/projects/${projectId}/planning/expand`,
    {
      method: 'POST',
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

export const getWorkItemTimeline = async (
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

export const getWorkItemAuditTrail = getWorkItemTimeline;

export const getSystemLogs = async (
  filters?: StructuredLogQuery,
): Promise<StructuredLogListResponse> => {
  const searchParams = new URLSearchParams();

  if (filters?.level) {
    searchParams.set('level', filters.level);
  }

  if (filters?.source) {
    searchParams.set('source', filters.source);
  }

  if (filters?.eventType) {
    searchParams.set('eventType', filters.eventType);
  }

  if (filters?.correlationId) {
    searchParams.set('correlationId', filters.correlationId);
  }

  if (filters?.workItemId) {
    searchParams.set('workItemId', filters.workItemId);
  }

  if (filters?.agentRunId) {
    searchParams.set('agentRunId', filters.agentRunId);
  }

  if (filters?.runtimeId) {
    searchParams.set('runtimeId', filters.runtimeId);
  }

  if (filters?.from) {
    searchParams.set('from', filters.from);
  }

  if (filters?.to) {
    searchParams.set('to', filters.to);
  }

  if (filters?.limit !== undefined) {
    searchParams.set('limit', String(filters.limit));
  }

  return fetchJson<StructuredLogListResponse>(
    '/logs/system',
    {
      method: 'GET',
    },
    searchParams,
  );
};

export const getProjectLogs = async (
  projectId: string,
  filters?: StructuredLogQuery,
): Promise<StructuredLogListResponse> => {
  const searchParams = new URLSearchParams();

  if (filters?.level) {
    searchParams.set('level', filters.level);
  }

  if (filters?.source) {
    searchParams.set('source', filters.source);
  }

  if (filters?.eventType) {
    searchParams.set('eventType', filters.eventType);
  }

  if (filters?.correlationId) {
    searchParams.set('correlationId', filters.correlationId);
  }

  if (filters?.workItemId) {
    searchParams.set('workItemId', filters.workItemId);
  }

  if (filters?.agentRunId) {
    searchParams.set('agentRunId', filters.agentRunId);
  }

  if (filters?.runtimeId) {
    searchParams.set('runtimeId', filters.runtimeId);
  }

  if (filters?.from) {
    searchParams.set('from', filters.from);
  }

  if (filters?.to) {
    searchParams.set('to', filters.to);
  }

  if (filters?.limit !== undefined) {
    searchParams.set('limit', String(filters.limit));
  }

  return fetchJson<StructuredLogListResponse>(
    `/projects/${projectId}/logs`,
    {
      method: 'GET',
    },
    searchParams,
  );
};
