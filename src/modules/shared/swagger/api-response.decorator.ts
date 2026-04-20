import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

type SwaggerDto = Type<unknown>;

const responseEnvelopeSchema = {
   type: 'object',
   properties: {
      status: {
         type: 'string',
         example: 'ok',
         description: 'Статус обработки запроса.',
      },
      data: {
         description: 'Данные успешного ответа.',
      },
      error: {
         nullable: true,
         example: null,
         description: 'Детали ошибки для неуспешного запроса.',
      },
   },
   required: ['status', 'data', 'error'],
};

/**
 * Documents the common interceptor envelope:
 * `{ status, data, error }`.
 */
export const ApiDataResponse = (model: SwaggerDto, description?: string) =>
   applyDecorators(
      ApiExtraModels(model),
      ApiOkResponse({
         description,
         schema: {
            allOf: [
               responseEnvelopeSchema,
               {
                  properties: {
                     data: { $ref: getSchemaPath(model) },
                     error: { nullable: true, example: null },
                  },
               },
            ],
         },
      }),
   );

/**
 * Documents an array payload inside the common interceptor envelope.
 */
export const ApiArrayDataResponse = (itemModel: SwaggerDto, description?: string) =>
   applyDecorators(
      ApiExtraModels(itemModel),
      ApiOkResponse({
         description,
         schema: {
            allOf: [
               responseEnvelopeSchema,
               {
                  properties: {
                     data: {
                        type: 'array',
                        items: { $ref: getSchemaPath(itemModel) },
                     },
                     error: { nullable: true, example: null },
                  },
               },
            ],
         },
      }),
   );

/**
 * Documents paginated data inside the common interceptor envelope.
 */
export const ApiPaginatedResponse = (itemModel: SwaggerDto, description?: string) =>
   applyDecorators(
      ApiExtraModels(itemModel),
      ApiOkResponse({
         description,
         schema: {
            allOf: [
               responseEnvelopeSchema,
               {
                  properties: {
                     data: {
                        type: 'object',
                        properties: {
                           items: {
                              type: 'array',
                              items: { $ref: getSchemaPath(itemModel) },
                           },
                           meta: {
                              type: 'object',
                              properties: {
                                 total: { type: 'number', example: 100 },
                                 page: { type: 'number', example: 1 },
                                 limit: { type: 'number', example: 10 },
                              },
                              required: ['total', 'page', 'limit'],
                           },
                        },
                        required: ['items', 'meta'],
                     },
                     error: { nullable: true, example: null },
                  },
               },
            ],
         },
      }),
   );

/**
 * Documents a boolean payload inside the common interceptor envelope.
 */
export const ApiBooleanResponse = (description?: string) =>
   applyDecorators(
      ApiOkResponse({
         description,
         schema: {
            allOf: [
               responseEnvelopeSchema,
               {
                  properties: {
                     data: { type: 'boolean', example: true },
                     error: { nullable: true, example: null },
                  },
               },
            ],
         },
      }),
   );
