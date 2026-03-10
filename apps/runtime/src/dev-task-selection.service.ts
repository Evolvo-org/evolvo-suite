import OpenAI from 'openai';
import { z } from 'zod';

import type { RuntimeEnvironment } from './config';
import { getAgentModelRoute } from './config/agent-model.config';

type DevReadyTaskCandidate = {
  projectId: string;
  projectName: string;
  workItemId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencyIds: string[];
};

type ProviderExecutionResult = {
  rawText: string;
};

type CodexSdkModule = {
  Codex: new (options: { apiKey?: string }) => {
    startThread(options: {
      model: string;
      sandboxMode: 'read-only';
      approvalPolicy: 'never';
      skipGitRepoCheck: boolean;
      workingDirectory: string;
    }): {
      run(
        prompt: string,
        options: {
          outputSchema: typeof selectionOutputJsonSchema;
        },
      ): Promise<{
        finalResponse: string;
      }>;
    };
  };
};

const selectionSchema = z.object({
  projectId: z.string().trim().min(1),
  workItemId: z.string().trim().min(1),
  rationale: z.string().trim().min(1).max(2000),
});

const selectionOutputJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    projectId: { type: 'string' },
    workItemId: { type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['projectId', 'workItemId', 'rationale'],
} as const;

type ProviderRunner = (input: {
  systemPrompt: string;
  userPrompt: string;
}) => Promise<ProviderExecutionResult>;

const importEsmModule = new Function(
  'specifier',
  'return import(specifier);',
) as <TModule>(specifier: string) => Promise<TModule>;

export class DevTaskSelectionService {
  public constructor(
    private readonly environment: RuntimeEnvironment,
    private readonly runners: {
      runOpenAi?: ProviderRunner;
      runCodex?: ProviderRunner;
    } = {},
  ) {}

  public async chooseNextTask(input: {
    candidates: DevReadyTaskCandidate[];
  }): Promise<{
    projectId: string;
    workItemId: string;
    rationale: string;
  } | null> {
    if (input.candidates.length === 0) {
      return null;
    }

    const prompts = this.buildPrompts(input.candidates);
    const route = getAgentModelRoute('dev');
    const execution =
      route.provider === 'codex'
        ? await (this.runners.runCodex ?? this.runCodex.bind(this))(prompts)
        : await (this.runners.runOpenAi ?? this.runOpenAi.bind(this))(prompts);

    const selected = selectionSchema.parse(JSON.parse(execution.rawText));
    const exists = input.candidates.some(
      (candidate) =>
        candidate.projectId === selected.projectId &&
        candidate.workItemId === selected.workItemId,
    );

    if (!exists) {
      throw new Error('Dev task selection returned a task that is not in the ready-for-dev candidate set.');
    }

    return selected;
  }

  private buildPrompts(candidates: DevReadyTaskCandidate[]): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = [
      'You are the dev task selector for Evolvo runtime.',
      'Choose exactly one ready-for-dev task to work on next.',
      'Prioritize prerequisites, foundational setup, and tasks that unblock the rest of delivery.',
      'If repository or project initialization work is present, prefer it before feature implementation unless another task is clearly more foundational.',
      'Return valid JSON only.',
    ].join(' ');

    const userPrompt = [
      'Ready-for-dev candidates:',
      ...candidates.map((candidate, index) => {
        return [
          `${index + 1}. projectId=${candidate.projectId}`,
          `projectName=${candidate.projectName}`,
          `workItemId=${candidate.workItemId}`,
          `title=${candidate.title}`,
          `description=${candidate.description ?? 'No description provided.'}`,
          `priority=${candidate.priority}`,
          `dependencyCount=${candidate.dependencyIds.length}`,
        ].join(' | ');
      }),
      'Output requirements:',
      '- Return projectId, workItemId, and rationale.',
      '- Choose one of the listed candidates only.',
      '- Keep the rationale concise and specific.',
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
    const route = getAgentModelRoute('dev');
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
    };
  }

  private async runCodex(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<ProviderExecutionResult> {
    const route = getAgentModelRoute('dev');
    const { Codex } = await importEsmModule<CodexSdkModule>(
      '@openai/codex-sdk',
    );
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
    const result = await thread.run(
      `${input.systemPrompt}\n\n${input.userPrompt}`,
      {
        outputSchema: selectionOutputJsonSchema,
      },
    );

    return {
      rawText: result.finalResponse.trim(),
    };
  }
}