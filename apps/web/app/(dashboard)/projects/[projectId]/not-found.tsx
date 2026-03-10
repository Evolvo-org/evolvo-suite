import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <div className="rounded-[2rem] border border-zinc-800/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
        Project route
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Project not found
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        The selected project no longer exists or the route parameters are stale.
        Return to the projects index and reopen an active project.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
          href="/projects"
        >
          Back to projects
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800/10 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-800/20 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-zinc-800"
          href="/projects/new"
        >
          Create project
        </Link>
      </div>
    </div>
  );
}
