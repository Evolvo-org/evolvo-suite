import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders the shared loading classes', () => {
    const markup = renderToStaticMarkup(
      <Skeleton className="h-12 w-full" data-testid="skeleton" />,
    );

    expect(markup).toContain('animate-pulse');
    expect(markup).toContain('h-12 w-full');
    expect(markup).toContain('data-testid="skeleton"');
  });
});
