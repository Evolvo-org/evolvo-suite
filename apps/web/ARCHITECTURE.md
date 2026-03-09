# Web Architecture

This file captures the frontend conventions implemented for Evolvo v2.

## Folder structure

- `app/` contains route files, layouts, loading boundaries, and server preloading entrypoints.
- `src/features/<feature>/components/` contains feature-local UI components.
- `src/lib/` contains shared query-client and page-preload helpers.
- `packages/api-client` owns typed API calls and query key factories.
- `packages/ui` owns reusable visual primitives.

## Rendering rules

- Route `page.tsx` files stay server-side unless browser-only behavior is required.
- Server pages preload data with TanStack Query and pass dehydrated state through `HydrationBoundary`.
- Client feature components consume cached data with `useQuery`.
- Writes use `useMutation`, then invalidate the relevant typed query keys.

## Component rules

- One component per `.tsx` file.
- Prefer feature folders for view composition and `@repo/ui` for reusable primitives.
- Keep route files thin and delegate most UI to feature components.

## Query key rules

- Query keys are defined in `packages/api-client`.
- Keys go from broad to specific.
- Use stable tuples such as `['projects', 'list', filters]` and `['projects', 'detail', projectId]`.
- Feature code must reuse shared query keys instead of building ad-hoc keys.