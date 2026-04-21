import { GetUsersInputDto, UpdateUserInputDto, UserOutputDto } from '@api/v1/user/dto';
import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '@shared/decorators';
import type { PaginatedDataDto } from '@shared/dtos';
import { AccessTokenGuard } from '@shared/guards';
import {
   ApiAuth,
   ApiBooleanResponse,
   ApiDataResponse,
   ApiPaginatedResponse,
} from '@shared/swagger';
import { UserService } from './user.service';

@ApiAuth()
@UseGuards(AccessTokenGuard)
@ApiTags('Users')
@Controller({
   path: 'users',
   version: '1',
})
export class UserController {
   constructor(private readonly userService: UserService) {}

   @ApiOperation({ summary: 'Получить список пользователей' })
   @ApiPaginatedResponse(UserOutputDto, 'Список пользователей с пагинацией.')
   @Get()
   async getList(@Query() filters: GetUsersInputDto): Promise<PaginatedDataDto<UserOutputDto>> {
      return this.userService.getList(filters);
   }

   @ApiOperation({ summary: 'Получить собственный профиль' })
   @ApiDataResponse(UserOutputDto, 'Профиль текущего пользователя.')
   @Get('me')
   async getMyProfile(@CurrentUserId() id: string): Promise<UserOutputDto> {
      return this.userService.getMyProfile(id);
   }

   @ApiOperation({ summary: 'Обновить пользователя по идентификатору' })
   @ApiParam({ name: 'id', description: 'Идентификатор пользователя.', format: 'uuid' })
   @ApiDataResponse(UserOutputDto, 'Пользователь успешно обновлён.')
   @Patch(':id')
   async update(
      @CurrentUserId() currentUserId: string,
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserInputDto,
   ): Promise<UserOutputDto> {
      return this.userService.update(id, currentUserId, updateUserDto);
   }

   @ApiOperation({ summary: 'Удалить пользователя по идентификатору' })
   @ApiParam({ name: 'id', description: 'Идентификатор пользователя.', format: 'uuid' })
   @ApiBooleanResponse('Пользователь успешно удалён.')
   @Delete(':id')
   async delete(@CurrentUserId() currentUserId: string, @Param('id') id: string): Promise<boolean> {
      return this.userService.delete(id, currentUserId);
   }
}
