'use client';

import { listProjects, projectQueryKeys } from '@repo/api-client';
import { Card } from '@repo/ui/components/card/card';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ProjectSearchForm } from './project-search-form';
import { ProjectStatusBadge } from './project-status-badge';

export const ProjectListPanel = ({ query }: { query: string }) => {
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list(query ? { query } : undefined),
    queryFn: () => listProjects(query ? { query } : undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            API-backed project inventory for the Evolvo control plane.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          href="/projects/new"
        >
          Create project
        </Link>
      </div>

      <ProjectSearchForm query={query} />

      {projectsQuery.isError ? (
        <Card className="p-6" title="Projects unavailable">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The API could not load project data. Check the API process and
            database connection.
          </p>
        </Card>
      ) : null}

      {projectsQuery.isLoading ? (
        <Card className="p-6" title="Loading projects">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Fetching the current project inventory.
          </p>
        </Card>
      ) : null}

      {projectsQuery.data && projectsQuery.data.items.length === 0 ? (
        <Card className="p-6" title="No projects yet">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create the first project to seed product definition, planning, and
            execution.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {projectsQuery.data?.items.map((project) => (
          <Card key={project.id} className="space-y-4 p-6" title={project.name}>
            <div className="flex items-center justify-between gap-4">
              <ProjectStatusBadge status={project.lifecycleStatus} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Runtime: {project.runtimeStatus}
              </span>
            </div>
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                {project.repository.owner}/{project.repository.name}
              </p>
              <p>Spec version: {project.productSpecVersion ?? 'none yet'}</p>
              <p>
                Plan version: {project.activePlanVersionNumber ?? 'none yet'}
              </p>
            </div>
            <Link
              className="inline-flex items-center text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
              href={`/projects/${project.id}`}
            >
              Open project overview
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
