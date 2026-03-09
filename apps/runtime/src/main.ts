import { loadRuntimeEnvironment } from './config';
import { log } from './logger';
import { RuntimeApp } from './runtime-app';

async function bootstrap(): Promise<void> {
  const environment = loadRuntimeEnvironment();
  const app = new RuntimeApp(environment);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    await app.stop(signal);
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await app.start();
}

void bootstrap().catch((error: unknown) => {
  log('error', 'Runtime shell failed during startup.', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
