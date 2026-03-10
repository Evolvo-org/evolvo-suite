import { CommandRunner, type CommandExecutionResult } from './command-runner';

export type QualityGateName = 'build' | 'lint' | 'typecheck' | 'test';

export interface QualityGateResult {
  gate: QualityGateName;
  succeeded: boolean;
  summary: string;
  command: CommandExecutionResult;
}

export class QualityGateRunner {
  public constructor(private readonly commandRunner = new CommandRunner()) {}

  public runBuild(cwd: string): Promise<QualityGateResult> {
    return this.runGate('build', cwd, 'pnpm', ['build']);
  }

  public runLint(cwd: string): Promise<QualityGateResult> {
    return this.runGate('lint', cwd, 'pnpm', ['lint']);
  }

  public runTypecheck(cwd: string): Promise<QualityGateResult> {
    return this.runGate('typecheck', cwd, 'pnpm', ['exec', 'tsc', '--noEmit']);
  }

  public runTests(cwd: string): Promise<QualityGateResult> {
    return this.runGate('test', cwd, 'pnpm', ['test']);
  }

  private async runGate(
    gate: QualityGateName,
    cwd: string,
    command: string,
    args: string[],
  ): Promise<QualityGateResult> {
    const result = await this.commandRunner.run({
      command,
      args,
      cwd,
      timeoutMs: 10 * 60 * 1000,
      artifactCandidates: ['coverage', 'dist'],
    });

    return {
      gate,
      succeeded: result.exitCode === 0 && result.timedOut === false,
      summary: this.createSummary(gate, result),
      command: result,
    };
  }

  private createSummary(
    gate: QualityGateName,
    result: CommandExecutionResult,
  ): string {
    if (result.timedOut) {
      return `${gate} timed out after ${result.durationMs}ms.`;
    }

    if (result.exitCode === 0) {
      return `${gate} completed successfully in ${result.durationMs}ms.`;
    }

    return `${gate} failed with exit code ${result.exitCode ?? 'unknown'} after ${result.durationMs}ms.`;
  }
}