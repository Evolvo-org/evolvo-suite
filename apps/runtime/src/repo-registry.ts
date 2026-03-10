import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface RepoRegistryProjectRepository {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  baseBranch: string;
}

export interface RepoRegistryProject {
  id: string;
  slug: string;
  repository: RepoRegistryProjectRepository;
}

export interface LocalRepoRegistration {
  projectId: string;
  projectSlug: string;
  localPath: string;
  repository: RepoRegistryProjectRepository;
  existsOnDisk: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RepoRegistryFile {
  items: LocalRepoRegistration[];
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const sanitizePathSegment = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
};

export class LocalRepoRegistry {
  private readonly reposDirectoryPath: string;
  private readonly metadataFilePath: string;

  public constructor(private readonly repositoriesRoot: string) {
    this.reposDirectoryPath = join(repositoriesRoot, 'repos');
    this.metadataFilePath = join(repositoriesRoot, '.runtime', 'repo-registry.json');
  }

  public async ensureStorage(): Promise<void> {
    await mkdir(this.reposDirectoryPath, { recursive: true });
    await mkdir(dirname(this.metadataFilePath), { recursive: true });

    if (!(await pathExists(this.metadataFilePath))) {
      await writeFile(
        this.metadataFilePath,
        JSON.stringify({ items: [] satisfies LocalRepoRegistration[] }, null, 2),
        'utf8',
      );
    }
  }

  public getMetadataFilePath(): string {
    return this.metadataFilePath;
  }

  public resolveProjectPath(project: Pick<RepoRegistryProject, 'id' | 'slug'>): string {
    const slugSegment = sanitizePathSegment(project.slug) || 'project';
    const idSegment = sanitizePathSegment(project.id) || 'unknown';
    return join(this.reposDirectoryPath, `${slugSegment}--${idSegment}`);
  }

  public async upsertProject(project: RepoRegistryProject): Promise<LocalRepoRegistration> {
    await this.ensureStorage();

    const registry = await this.readRegistry();
    const localPath = this.resolveProjectPath(project);
    const now = new Date().toISOString();
    const existingIndex = registry.items.findIndex((item) => item.projectId === project.id);
    const existingRegistration =
      existingIndex >= 0 ? registry.items[existingIndex] : undefined;
    const registration: LocalRepoRegistration = {
      projectId: project.id,
      projectSlug: project.slug,
      localPath,
      repository: {
        owner: project.repository.owner,
        name: project.repository.name,
        url: project.repository.url,
        defaultBranch: project.repository.defaultBranch,
        baseBranch: project.repository.baseBranch,
      },
      existsOnDisk: await pathExists(localPath),
      createdAt: existingRegistration?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      registry.items.splice(existingIndex, 1, registration);
    } else {
      registry.items.push(registration);
    }

    await this.writeRegistry(registry);
    return registration;
  }

  public async getProject(projectId: string): Promise<LocalRepoRegistration | null> {
    await this.ensureStorage();
    const registry = await this.readRegistry();
    return registry.items.find((item) => item.projectId === projectId) ?? null;
  }

  public async listProjects(): Promise<LocalRepoRegistration[]> {
    await this.ensureStorage();
    const registry = await this.readRegistry();
    return registry.items;
  }

  public async projectExists(projectId: string): Promise<boolean> {
    const registration = await this.getProject(projectId);

    if (!registration) {
      return false;
    }

    return pathExists(registration.localPath);
  }

  private async readRegistry(): Promise<RepoRegistryFile> {
    const content = await readFile(this.metadataFilePath, 'utf8');
    return JSON.parse(content) as RepoRegistryFile;
  }

  private async writeRegistry(registry: RepoRegistryFile): Promise<void> {
    await writeFile(this.metadataFilePath, JSON.stringify(registry, null, 2), 'utf8');
  }
}