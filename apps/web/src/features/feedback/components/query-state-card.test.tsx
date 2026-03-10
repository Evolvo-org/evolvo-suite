import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  QueryEmptyCard,
  QueryLoadingCard,
  QueryStateCard,
} from './query-state-card';

describe('QueryStateCard', () => {
  it('renders retry affordances when supplied', () => {
    const markup = renderToStaticMarkup(
      <QueryStateCard
        title="Projects unavailable"
        description="The API could not load projects."
        onRetry={() => undefined}
      />,
    );

    expect(markup).toContain('Projects unavailable');
    expect(markup).toContain('Try again');
  });

  it('renders loading skeleton content', () => {
    const markup = renderToStaticMarkup(
      <QueryLoadingCard
        title="Loading projects"
        description="Fetching the current project inventory."
      />,
    );

    expect(markup).toContain('Loading projects');
    expect(markup).toContain('animate-pulse');
  });

  it('renders the empty-state wrapper', () => {
    const markup = renderToStaticMarkup(
      <QueryEmptyCard
        title="No projects yet"
        description="Create the first project to populate this area."
      />,
    );

    expect(markup).toContain('No projects yet');
    expect(markup).toContain('Create the first project to populate this area.');
  });
});
