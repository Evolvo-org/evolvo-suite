import type { RuntimeEnvironment } from './config';
import { log } from './logger';

export class RuntimeApp {
  private isStopping = false;

  public constructor(private readonly environment: RuntimeEnvironment) {}

  public async start(): Promise<void> {
    log('info', 'Runtime shell started.', {
      runtimeId: this.environment.runtimeId,
      apiBaseUrl: this.environment.apiBaseUrl,
      repositoriesRoot: this.environment.repositoriesRoot,
      heartbeatIntervalMs: this.environment.heartbeatIntervalMs,
    });
  }

  public async stop(signal: NodeJS.Signals): Promise<void> {
    if (this.isStopping) {
      return;
    }

    this.isStopping = true;
    log('warn', 'Runtime shell stopping.', {
      runtimeId: this.environment.runtimeId,
      signal,
    });
  }
}
