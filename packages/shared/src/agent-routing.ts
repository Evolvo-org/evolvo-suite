import type { AgentType } from './agents';

export const agentProviders = [
  'openai',
  'codex',
] as const;

export type AgentProvider = (typeof agentProviders)[number];

export interface AgentRouteTarget {
  provider: AgentProvider;
  model: string;
}

export interface AgentRoutingConfig {
  defaultProvider: AgentProvider;
  defaultModel: string;
  agentRoutes: Partial<Record<AgentType, AgentRouteTarget>>;
}

export interface SystemAgentRoutingResponse {
  routing: AgentRoutingConfig;
  updatedAt: string | null;
}

export interface ProjectAgentRoutingSettingsResponse {
  projectId: string;
  defaults: AgentRoutingConfig;
  overrides: AgentRoutingConfig | null;
  effective: AgentRoutingConfig;
  updatedAt: string | null;
}

export const agentRouteSources = [
  'system-default',
  'system-agent',
  'project-default',
  'project-agent',
] as const;

export type AgentRouteSource = (typeof agentRouteSources)[number];

export interface ResolvedAgentRouteResponse {
  projectId: string | null;
  agentType: AgentType;
  provider: AgentProvider;
  model: string;
  source: AgentRouteSource;
}

export const defaultAgentRoutingConfig: AgentRoutingConfig = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-5.4-mini',
  agentRoutes: {
    planning: {
      provider: 'openai',
      model: 'gpt-5.4',
    },
    dev: {
      provider: 'openai',
      model: 'gpt-5.4',
    },
    review: {
      provider: 'openai',
      model: 'gpt-5.4',
    },
    release: {
      provider: 'openai',
      model: 'gpt-5.4',
    },
  },
};