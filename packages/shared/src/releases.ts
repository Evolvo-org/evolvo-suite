export const releaseRunStatuses = [
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type ReleaseRunStatus = (typeof releaseRunStatuses)[number];

export const releaseNoteFormats = ['markdown', 'plainText'] as const;
export type ReleaseNoteFormat = (typeof releaseNoteFormats)[number];

export interface CreateReleaseRunRequest {
  runtimeId?: string;
  leaseId?: string;
  worktreeId?: string;
  summary?: string;
  startedAt?: string;
}

export interface RecordReleaseResultRequest {
  status: Exclude<ReleaseRunStatus, 'running'>;
  summary?: string;
  errorMessage?: string;
  mergeCommitSha?: string;
  releaseUrl?: string;
  completedAt?: string;
}

export interface CreateReleaseVersionRequest {
  version: string;
  tagName: string;
  targetBranch?: string;
  commitSha?: string;
}

export interface UpsertReleaseNoteRequest {
  title?: string;
  content: string;
  format?: ReleaseNoteFormat;
}

export interface ReleaseVersionRecord {
  id: string;
  version: string;
  tagName: string;
  targetBranch: string | null;
  commitSha: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseNoteRecord {
  id: string;
  title: string | null;
  content: string;
  format: ReleaseNoteFormat;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseRunRecord {
  id: string;
  projectId: string;
  workItemId: string;
  workItemTitle: string;
  runtimeId: string | null;
  leaseId: string | null;
  worktreeId: string | null;
  status: ReleaseRunStatus;
  summary: string | null;
  errorMessage: string | null;
  mergeCommitSha: string | null;
  releaseUrl: string | null;
  startedAt: string;
  completedAt: string | null;
  version: ReleaseVersionRecord | null;
  note: ReleaseNoteRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseHistoryResponse {
  projectId: string;
  items: ReleaseRunRecord[];
}
