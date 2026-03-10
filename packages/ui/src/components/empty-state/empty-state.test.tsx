import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders title, description, and action content', () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        title="Nothing here"
        description="Create the first item to populate this area."
        action={<a href="/projects/new">Create project</a>}
      />,
    );

    expect(markup).toContain('Nothing here');
    expect(markup).toContain('Create the first item to populate this area.');
    expect(markup).toContain('Create project');
  });
});
