import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
} from '@nestjs/common';
import type { UpsertProductSpecRequest } from '@repo/shared';
import { upsertProductSpecSchema } from '@repo/validation';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

import { ProductSpecsService } from './product-specs.service.js';

@Controller('projects/:projectId/product-spec')
export class ProductSpecsController {
  public constructor(
    @Inject(ProductSpecsService)
    private readonly productSpecsService: ProductSpecsService,
  ) {}

  @Get()
  public async getProductSpec(@Param('projectId') projectId: string) {
    return this.productSpecsService.getProductSpec(projectId);
  }

  @Put()
  public async upsertProductSpec(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(upsertProductSpecSchema))
    body: UpsertProductSpecRequest,
  ) {
    const productSpec = await this.productSpecsService.upsertProductSpec(
      projectId,
      body,
    );

    return {
      success: true as const,
      message: 'Product specification saved successfully.',
      data: productSpec,
    };
  }
}
