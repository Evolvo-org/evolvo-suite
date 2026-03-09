import type { ReactNode } from 'react';

export interface TableColumn<TItem> {
  key: string;
  header: string;
  render: (item: TItem) => ReactNode;
}

export interface TableProps<TItem> {
  columns: ReadonlyArray<TableColumn<TItem>>;
  rows: ReadonlyArray<TItem>;
  getRowKey: (item: TItem) => string;
  emptyMessage?: string;
}

export const Table = <TItem,>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No rows available.',
}: TableProps<TItem>) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/10 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-800/10 text-left dark:divide-white/10">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/10 bg-white dark:divide-white/10 dark:bg-zinc-950">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
