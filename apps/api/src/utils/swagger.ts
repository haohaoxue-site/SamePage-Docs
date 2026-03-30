import type { Type } from '@nestjs/common'
import { applyDecorators } from '@nestjs/common'
import {
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger'

type ApiRequestResponseModel = Type<unknown> | [Type<unknown>] | null

export function ApiRequestResponse(
  model: ApiRequestResponseModel,
) {
  const actualModel = Array.isArray(model) ? model[0] : model

  const dataSchema = actualModel
    ? Array.isArray(model)
      ? {
          type: 'array',
          items: {
            $ref: getSchemaPath(actualModel),
          },
        }
      : {
          $ref: getSchemaPath(actualModel),
        }
    : {
        nullable: true,
      }

  return applyDecorators(
    ...(actualModel ? [ApiExtraModels(actualModel)] : []),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['code', 'message', 'data'],
        properties: {
          code: {
            type: 'number',
          },
          message: {
            type: 'string',
          },
          data: dataSchema,
        },
      },
    }),
  )
}
