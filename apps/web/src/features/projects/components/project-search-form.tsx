import { Input } from '@repo/ui/components/input/input';

export const ProjectSearchForm = ({ query }: { query: string }) => {
  return (
    <form className="flex flex-col gap-3 sm:flex-row" method="get">
      <Input
        name="query"
        defaultValue={query}
        placeholder="Search projects by name"
        aria-label="Search projects"
      />
      <button
        type="submit"
        className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Search
      </button>
    </form>
  );
};
