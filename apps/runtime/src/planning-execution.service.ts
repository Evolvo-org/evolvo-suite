import OpenAI from 'openai';
import { Codex } from '@openai/codex-sdk';
import { z } from 'zod';
import type {
  CreateUsageEventRequest,
  PlanningGeneratedResultInput,
  RuntimePlanningContext,
  RuntimeWorkDispatchResponse,
} from '@repo/shared';

import type { RuntimeEnvironment } from './config';
import { getAgentModelRoute } from './config/agent-model.config';

const planningTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5_000).optional(),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(500)).max(8),
  ambiguityNotes: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
});

const planningModelOutputSchema = z
  .object({
    accepted: z.boolean(),
    decisionSummary: z.string().trim().min(1).max(10_000),
    epicTitle: z.string().trim().min(1).max(200).optional(),
    epicSummary: z.string().trim().min(1).max(5_000).optional(),
    tasks: z.array(planningTaskSchema).max(8),
  })
  .superRefine((value, context) => {
    if (value.accepted && value.tasks.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Accepted planning results must include at least one task.',
        path: ['tasks'],
      });
    }

    if (!value.accepted && value.tasks.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejected planning results must not include generated tasks.',
        path: ['tasks'],
      });
    }
  });

const planningOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    accepted: { type: 'boolean' },
    decisionSummary: { type: 'string' },
    epicTitle: { type: 'string' },
    epicSummary: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          acceptanceCriteria: {
            type: 'array',
            items: { type: 'string' },
          },
          ambiguityNotes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['title', 'acceptanceCriteria'],
      },
    },
  },
  required: ['accepted', 'decisionSummary', 'tasks'],
} as const;

type PlanningModelOutput = z.infer<typeof planningModelOutputSchema>;

type ProviderUsagePayload = Pick<
  CreateUsageEventRequest,
  'provider' | 'model' | 'inputTokens' | 'outputTokens' | 'totalTokens'
>;

type ProviderExecutionResult = {
  rawText: string;
  usage: ProviderUsagePayload | null;
};

type ProviderRunner = (input: {
  systemPrompt: string;
  userPrompt: string;
}) => Promise<ProviderExecutionResult>;

export class PlanningExecutionService {
  public constructor(
    private readonly environment: RuntimeEnvironment,
    private readonly runners: {
      runOpenAi?: ProviderRunner;
      runCodex?: ProviderRunner;
    } = {},
  ) {}

  public async execute(input: {
    dispatch: RuntimeWorkDispatchResponse;
  }): Promise<{
    generatedResult: PlanningGeneratedResultInput;
    usage: ProviderUsagePayload | null;
  }> {
    if (!input.dispatch.project || !input.dispatch.workItem) {
      throw new Error('Planning execution requires a leased project and work item.');
    }

    const planningContext = input.dispatch.planningContext;

    if (!planningContext) {
      throw new Error('Planning execution requires planning context in the runtime dispatch payload.');
    }

    const route = getAgentModelRoute('planning');
    const prompts = this.buildPrompts({
      projectName: input.dispatch.project.name,
      repositoryOwner: input.dispatch.project.repository.owner,
      repositoryName: input.dispatch.project.repository.name,
      workItemTitle: input.dispatch.workItem.title,
      workItemDescription: input.dispatch.workItem.description,
      planningContext,
    });

    const execution =
      route.provider === 'codex'
        ? await (this.runners.runCodex ?? this.runCodex.bind(this))({
            systemPrompt: prompts.systemPrompt,
            userPrompt: prompts.userPrompt,
          })
        : await (this.runners.runOpenAi ?? this.runOpenAi.bind(this))({
            systemPrompt: prompts.systemPrompt,
            userPrompt: prompts.userPrompt,
          });

    const parsed = planningModelOutputSchema.parse(JSON.parse(execution.rawText)) as PlanningModelOutput;

    return {
      generatedResult: {
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
        accepted: parsed.accepted,
        decisionSummary: parsed.decisionSummary.trim(),
        epicTitle: parsed.epicTitle?.trim() || undefined,
        epicSummary: parsed.epicSummary?.trim() || undefined,
        tasks: parsed.tasks.map((task) => ({
          title: task.title.trim(),
          description: task.description?.trim() || undefined,
          acceptanceCriteria: task.acceptanceCriteria.map((criterion) => criterion.trim()),
          ambiguityNotes: task.ambiguityNotes?.map((note) => note.trim()) ?? [],
        })),
      },
      usage: execution.usage,
    };
  }

  private buildPrompts(input: {
    projectName: string;
    repositoryOwner: string;
    repositoryName: string;
    workItemTitle: string;
    workItemDescription: string | null;
    planningContext: RuntimePlanningContext;
  }) {
    const systemPrompt = [
      'You are the planning agent for Evolvo.',
      'Decide whether the planning request should be accepted or rejected.',
      'If accepted, expand it into execution-ready subtasks beneath the source planning item.',
      'Return valid JSON only.',
      'Use concise, operator-readable language.',
      'When similar work already exists, reject the idea unless the new work is materially distinct.',
    ].join(' ');

    const userPrompt = [
      `Project: ${input.projectName}`,
      `Repository: ${input.repositoryOwner}/${input.repositoryName}`,
      `Planning request title: ${input.workItemTitle}`,
      `Planning request description: ${input.workItemDescription ?? 'No detailed description provided.'}`,
      `Product spec version: ${input.planningContext.productSpecVersion ?? 'none'}`,
      'Product spec content:',
      input.planningContext.productSpecContent ?? 'No active product spec content is available.',
      `Development plan: ${input.planningContext.developmentPlanTitle ?? 'none'}`,
      `Development plan version: ${input.planningContext.developmentPlanVersionNumber ?? 'none'}`,
      'Development plan content:',
      input.planningContext.developmentPlanContent ?? 'No active development plan content is available.',
      input.planningContext.duplicateWorkItemTitle
        ? `Potential duplicate work already exists: ${input.planningContext.duplicateWorkItemTitle}`
        : 'No duplicate work item was identified in the current project snapshot.',
      'Output requirements:',
      '- Return a JSON object with accepted, decisionSummary, epicTitle, epicSummary, and tasks.',
      '- If accepted is true, include between 1 and 8 tasks.',
      '- Each task must include title and acceptanceCriteria.',
      '- Add ambiguityNotes only when the work cannot be executed safely without clarification.',
      '- If accepted is false, tasks must be an empty array.',
    ].join('\n');

    return {
      systemPrompt,
      userPrompt,
    };
  }

  private async runOpenAi(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<ProviderExecutionResult> {
    const route = getAgentModelRoute('planning');
    const client = new OpenAI({
      apiKey: this.environment.openAiApiKey ?? undefined,
      maxRetries: route.maxRetries,
      timeout: route.timeoutMs,
    });
    const response = await client.responses.create({
      model: route.model,
      temperature: route.temperature,
      max_output_tokens: route.maxTokens,
      input: `${input.systemPrompt}\n\n${input.userPrompt}`,
    });

    return {
      rawText: response.output_text.trim(),
      usage: response.usage
        ? {
            provider: route.provider,
            model: route.model,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : null,
    };
  }

  private async runCodex(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<ProviderExecutionResult> {
    const route = getAgentModelRoute('planning');
    const client = new Codex({
      apiKey: this.environment.codexApiKey ?? undefined,
    });
    const thread = client.startThread({
      model: route.model,
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      skipGitRepoCheck: true,
      workingDirectory: this.environment.repositoriesRoot,
    });
    const result = await thread.run(`${input.systemPrompt}\n\n${input.userPrompt}`, {
      outputSchema: planningOutputJsonSchema,
    });

    return {
      rawText: result.finalResponse.trim(),
      usage: result.usage
        ? {
            provider: route.provider,
            model: route.model,
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
            totalTokens:
              result.usage.input_tokens +
              result.usage.cached_input_tokens +
              result.usage.output_tokens,
          }
        : null,
    };
  }
}