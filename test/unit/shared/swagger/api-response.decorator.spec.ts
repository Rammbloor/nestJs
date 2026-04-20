import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiArrayDataResponse, ApiDataResponse, ApiPaginatedResponse } from '@shared/swagger';

type ReferenceObject = {
   $ref: string;
};

type SchemaObject = {
   allOf?: SchemaObject[];
   properties?: Record<string, unknown>;
   content?: Record<string, { schema?: SchemaObject | ReferenceObject }>;
};

type ResponseObject = {
   content?: Record<string, { schema?: SchemaObject | ReferenceObject }>;
};

type OpenAPIObject = {
   paths: Record<string, { get?: { responses?: Record<string, ResponseObject | ReferenceObject> } }>;
   components?: {
      schemas?: Record<string, unknown>;
   };
};

class TestPayloadDto {
   @ApiProperty({
      description: 'Payload identifier.',
      example: 'user-123',
   })
   id: string;
}

function getResponseObject(document: OpenAPIObject, path: string): ResponseObject {
   const response = document.paths[path]?.get?.responses?.['200'];

   expect(response).toBeDefined();
   expect(isReferenceObject(response)).toBe(false);

   return response as ResponseObject;
}

function getApplicationJsonSchema(document: OpenAPIObject, path: string): SchemaObject & {
   allOf: SchemaObject[];
} {
   const response = getResponseObject(document, path);
   const schema = response.content?.['application/json']?.schema;

   expect(schema).toBeDefined();
   expect(isReferenceObject(schema)).toBe(false);
   expect(hasAllOf(schema)).toBe(true);

   return schema as SchemaObject & { allOf: SchemaObject[] };
}

function isReferenceObject(value: unknown): value is ReferenceObject {
   return typeof value === 'object' && value !== null && '$ref' in value;
}

function hasAllOf(value: unknown): value is SchemaObject & { allOf: SchemaObject[] } {
   return (
      typeof value === 'object' &&
      value !== null &&
      'allOf' in value &&
      Array.isArray((value as { allOf?: unknown }).allOf)
   );
}

function getFirstDataProperty(responseSchema: SchemaObject & { allOf: SchemaObject[] }): unknown {
   const firstSchema = responseSchema.allOf[0];

   expect(firstSchema).toBeDefined();
   expect(firstSchema.properties?.data).toBeDefined();

   return firstSchema.properties?.data;
}

@Controller('swagger-test')
class TestSwaggerController {
   @ApiDataResponse(TestPayloadDto, 'Тестовый ответ.')
   @Get()
   getPayload(): TestPayloadDto {
      return { id: 'user-123' };
   }

   @ApiArrayDataResponse(TestPayloadDto, 'Тестовый список.')
   @Get('array')
   getPayloads(): TestPayloadDto[] {
      return [{ id: 'user-123' }];
   }

   @ApiPaginatedResponse(TestPayloadDto, 'Тестовая пагинация.')
   @Get('paginated')
   getPaginatedPayloads() {
      return {
         items: [{ id: 'user-123' }],
         meta: {
            total: 1,
            page: 1,
            limit: 10,
         },
      };
   }
}

describe('ApiDataResponse', () => {
   it('references payload dto inside data without overriding it with null example', async () => {
      const moduleRef = await Test.createTestingModule({
         controllers: [TestSwaggerController],
      }).compile();

      const app = moduleRef.createNestApplication();

      await app.init();

      const document = SwaggerModule.createDocument(
         app,
         new DocumentBuilder().build(),
      ) as unknown as OpenAPIObject;
      const responseSchema = getApplicationJsonSchema(document, '/swagger-test');

      expect(responseSchema).toMatchObject({
         allOf: [
            {
               properties: {
                  data: {
                     description: 'Данные успешного ответа.',
                  },
               },
            },
            {
               properties: {
                  data: {
                     $ref: '#/components/schemas/TestPayloadDto',
                  },
               },
            },
         ],
      });
      expect(getFirstDataProperty(responseSchema)).not.toHaveProperty('example');
      expect(document.components?.schemas?.TestPayloadDto).toBeDefined();

      await app.close();
   });

   it('documents array payloads inside data without null example override', async () => {
      const moduleRef = await Test.createTestingModule({
         controllers: [TestSwaggerController],
      }).compile();

      const app = moduleRef.createNestApplication();

      await app.init();

      const document = SwaggerModule.createDocument(
         app,
         new DocumentBuilder().build(),
      ) as unknown as OpenAPIObject;
      const responseSchema = getApplicationJsonSchema(document, '/swagger-test/array');

      expect(responseSchema).toMatchObject({
         allOf: [
            {
               properties: {
                  data: {
                     description: 'Данные успешного ответа.',
                  },
               },
            },
            {
               properties: {
                  data: {
                     type: 'array',
                     items: {
                        $ref: '#/components/schemas/TestPayloadDto',
                     },
                  },
               },
            },
         ],
      });
      expect(getFirstDataProperty(responseSchema)).not.toHaveProperty('example');

      await app.close();
   });

   it('documents paginated payloads inside data without null example override', async () => {
      const moduleRef = await Test.createTestingModule({
         controllers: [TestSwaggerController],
      }).compile();

      const app = moduleRef.createNestApplication();

      await app.init();

      const document = SwaggerModule.createDocument(
         app,
         new DocumentBuilder().build(),
      ) as unknown as OpenAPIObject;
      const responseSchema = getApplicationJsonSchema(document, '/swagger-test/paginated');

      expect(responseSchema).toMatchObject({
         allOf: [
            {
               properties: {
                  data: {
                     description: 'Данные успешного ответа.',
                  },
               },
            },
            {
               properties: {
                  data: {
                     type: 'object',
                     properties: {
                        items: {
                           type: 'array',
                           items: {
                              $ref: '#/components/schemas/TestPayloadDto',
                           },
                        },
                        meta: {
                           type: 'object',
                        },
                     },
                  },
               },
            },
         ],
      });
      expect(getFirstDataProperty(responseSchema)).not.toHaveProperty('example');

      await app.close();
   });
});
