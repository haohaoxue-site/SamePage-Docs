import type { Type } from '@nestjs/common'
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import { applyDecorators } from '@nestjs/common'
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger'

type ApiRequestResponseModel = Type<unknown> | [Type<unknown>] | SchemaObject | [SchemaObject] | null

function isSchemaObject(value: unknown): value is SchemaObject {
  return typeof value === 'object' && value !== null && !('prototype' in value)
}

export function ApiRequestResponse(
  model: ApiRequestResponseModel,
) {
  const actualModel = Array.isArray(model) ? model[0] : model

  let dataSchema: SchemaObject | { $ref: string } | { type: string, items: SchemaObject | { $ref: string } } | { nullable: boolean }
  let extraModels: Type<unknown>[] = []

  if (actualModel === null || actualModel === undefined) {
    dataSchema = { nullable: true }
  }
  else if (isSchemaObject(actualModel)) {
    dataSchema = Array.isArray(model)
      ? { type: 'array', items: actualModel }
      : actualModel
  }
  else {
    extraModels = [actualModel]
    dataSchema = Array.isArray(model)
      ? { type: 'array', items: { $ref: getSchemaPath(actualModel) } }
      : { $ref: getSchemaPath(actualModel) }
  }

  return applyDecorators(
    ...(extraModels.length ? [ApiExtraModels(...extraModels)] : []),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['code', 'message', 'data'],
        properties: {
          code: { type: 'number' },
          message: { type: 'string' },
          data: dataSchema as unknown as SchemaObject,
        },
      },
    }),
  )
}
