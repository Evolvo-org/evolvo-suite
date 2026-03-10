import { Card } from '@repo/ui/components/card/card';

import { projectWriteCapabilities } from '../../../../src/features/auth/lib/access-control';
import { requireCurrentUser } from '../../../../src/features/auth/lib/server-auth';
import { ProjectCreateForm } from '../../../../src/features/projects/components/project-create-form';

export default async function NewProjectPage() {
  await requireCurrentUser(projectWriteCapabilities);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create project
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Seed a project with its repository, product specification, optional
          development plan, and durable queue defaults.
        </p>
      </div>
      <Card className="p-6" title="First implementation slice">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This flow writes project, repository, product specification, queue
          limits, and optional development plan records through the NestJS API
          only.
        </p>
      </Card>
      <ProjectCreateForm />
    </div>
  );
}
