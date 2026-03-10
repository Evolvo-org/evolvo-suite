import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface CommandExecutionRequest {
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  artifactCandidates?: string[];
}

export interface CommandExecutionResult {
  command: string;
  args: string[];
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  artifactPaths: string[];
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export class CommandRunner {
  public async run(
    request: CommandExecutionRequest,
  ): Promise<CommandExecutionResult> {
    const startedAt = Date.now();

    return new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(request.command, request.args ?? [], {
        cwd: request.cwd,
        env: {
          ...process.env,
          ...(request.env ?? {}),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutHandle =
        request.timeoutMs && request.timeoutMs > 0
          ? setTimeout(() => {
              timedOut = true;
              child.kill('SIGTERM');
            }, request.timeoutMs)
          : null;

      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        rejectPromise(error);
      });

      child.on('close', async (exitCode) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        const artifactPaths = await this.collectArtifactPaths(
          request.cwd,
          request.artifactCandidates,
        );

        resolvePromise({
          command: request.command,
          args: request.args ?? [],
          cwd: request.cwd,
          stdout,
          stderr,
          exitCode,
          timedOut,
          durationMs: Date.now() - startedAt,
          artifactPaths,
        });
      });
    });
  }

  private async collectArtifactPaths(
    cwd: string,
    artifactCandidates: string[] | undefined,
  ): Promise<string[]> {
    if (!artifactCandidates?.length) {
      return [];
    }

    const existingCandidates = await Promise.all(
      artifactCandidates.map(async (candidate) => {
        const fullPath = resolve(cwd, candidate);
        return (await pathExists(fullPath)) ? fullPath : null;
      }),
    );

    return existingCandidates.filter(
      (value): value is string => typeof value === 'string',
    );
  }
}