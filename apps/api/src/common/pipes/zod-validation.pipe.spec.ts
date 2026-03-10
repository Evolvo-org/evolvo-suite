import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  it('parses double-serialized JSON objects before validation', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        actorName: z.string().min(1),
        summary: z.string().optional(),
      }),
    );

    expect(
      pipe.transform('{"actorName":"Operator","summary":"Looks good."}'),
    ).toEqual({
      actorName: 'Operator',
      summary: 'Looks good.',
    });
  });

  it('parses simple object-literal strings before validation', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        actorName: z.string().min(1),
      }),
    );

    expect(pipe.transform('{actorName: "Operator One"}')).toEqual({
      actorName: 'Operator One',
    });
  });

  it('keeps rejecting plain strings when the schema expects an object', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        actorName: z.string().min(1),
      }),
    );

    expect(() => pipe.transform('Operator')).toThrow(BadRequestException);
  });
});