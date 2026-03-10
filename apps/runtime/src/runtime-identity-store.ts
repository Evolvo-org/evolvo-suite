import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface PersistedRuntimeIdentity {
  runtimeId: string;
  displayName: string;
  capabilities: string[];
  apiBaseUrl: string;
  lastRegisteredAt: string;
  lastSeenAt: string;
}

export class RuntimeIdentityStore {
  private readonly filePath: string;

  public constructor(repositoriesRoot: string) {
    this.filePath = join(repositoriesRoot, '.runtime-identity.json');
  }

  public async load(): Promise<PersistedRuntimeIdentity | null> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      return JSON.parse(content) as PersistedRuntimeIdentity;
    } catch {
      return null;
    }
  }

  public async save(identity: PersistedRuntimeIdentity): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(identity, null, 2), 'utf8');
  }
}