import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

/**
 * Adds the standard access-token security contract and common auth error responses.
 */
export const ApiAuth = () =>
   applyDecorators(
      ApiBearerAuth('AccessToken'),
      ApiUnauthorizedResponse({
         description: 'Пользователь не авторизован или access token невалиден.',
      }),
      ApiForbiddenResponse({ description: 'Доступ к ресурсу запрещён.' }),
   );
