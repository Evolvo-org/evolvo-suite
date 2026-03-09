import type { ProductSpec } from '@repo/db/client'
import type { ProductSpecResponse } from '@repo/shared';

export const mapProductSpec = (
  projectId: string,
  productSpec: ProductSpec | null,
): ProductSpecResponse => ({
  projectId,
  productSpecId: productSpec?.id ?? null,
  content: productSpec?.content ?? null,
  version: productSpec?.version ?? null,
  updatedAt: productSpec?.updatedAt.toISOString() ?? null,
});
