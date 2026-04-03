import type { ArgumentMetadata, PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'
import { BadRequestException } from '@nestjs/common'
import { ZodError } from 'zod'

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value)
    }
    catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(
          error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        )
      }
      throw error
    }
  }
}
