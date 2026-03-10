import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

const tryParseJsonString = <TValue>(value: TValue): TValue | unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

@Injectable()
export class ZodValidationPipe<TInput, TOutput = TInput>
  implements PipeTransform<TInput, TOutput>
{
  public constructor(private readonly schema: ZodSchema<TOutput>) {}

  public transform(value: TInput): TOutput {
    try {
      return this.schema.parse(tryParseJsonString(value));
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
