import { describe, expect, it } from 'vitest';

import { CommandRunner } from './command-runner';

describe('CommandRunner', () => {
  it('captures stdout, stderr, and exit code', async () => {
    const runner = new CommandRunner();
    const result = await runner.run({
      command: 'node',
      args: ['-e', "console.log('hello'); console.error('warn')"],
      cwd: process.cwd(),
      timeoutMs: 5000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello');
    expect(result.stderr).toContain('warn');
    expect(result.timedOut).toBe(false);
  });
});