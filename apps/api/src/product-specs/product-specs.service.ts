import { Inject, Injectable } from '@nestjs/common';
import type {
  ProductSpecResponse,
  UpsertProductSpecRequest,
} from '@repo/shared';

import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

import { mapProductSpec } from './product-specs.mapper';

@Injectable()
export class ProductSpecsService {
  public constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  public async getProductSpec(projectId: string): Promise<ProductSpecResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const productSpec = await this.prisma.productSpec.findUnique({
      where: { projectId },
    });

    return mapProductSpec(projectId, productSpec);
  }

  public async upsertProductSpec(
    projectId: string,
    payload: UpsertProductSpecRequest,
  ): Promise<ProductSpecResponse> {
    await this.projectsService.ensureProjectExists(projectId);

    const existing = await this.prisma.productSpec.findUnique({
      where: { projectId },
    });

    const productSpec = existing
      ? await this.prisma.productSpec.update({
          where: { projectId },
          data: {
            content: payload.content.trim(),
            version: existing.version + 1,
          },
        })
      : await this.prisma.productSpec.create({
          data: {
            projectId,
            content: payload.content.trim(),
            version: 1,
          },
        });

    return mapProductSpec(projectId, productSpec);
  }
}
