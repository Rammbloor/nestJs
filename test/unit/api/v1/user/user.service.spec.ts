jest.mock('typeorm-transactional', () => ({
   IsolationLevel: {
      REPEATABLE_READ: 'REPEATABLE READ',
   },
   Transactional:
      () =>
      (_target: unknown, _propertyKey: string | symbol, descriptor: PropertyDescriptor) =>
         descriptor,
}));

import { UpdateUserInputDto, UserOutputDto } from '@api/v1/user/dto';
import { UserRepository } from '@api/v1/user/user.repository';
import { UserService } from '@api/v1/user/user.service';
import type { Mapper } from '@automapper/core';

describe('UserService', () => {
   const userRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findActiveOne: jest.fn(),
      getList: jest.fn(),
      softDelete: jest.fn(),
   };

   const mapper = {
      map: jest.fn(),
      mapArray: jest.fn(),
   };

   const service = new UserService(
      userRepository as unknown as UserRepository,
      mapper as unknown as Mapper,
   );

   afterEach(() => {
      jest.clearAllMocks();
   });

   it('creates users with login and password fields', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({ id: 'user-id' });
      userRepository.save.mockResolvedValue({ id: 'user-id' });
      mapper.map.mockReturnValue({ id: 'user-id' });

      await expect(
         service.create({
            login: 'john',
            email: 'john@example.com',
            password: 'hashed-password',
            age: 30,
            firstName: 'John',
            lastName: 'Doe',
            description: 'desc',
         }),
      ).resolves.toEqual({ id: 'user-id' });

      expect(userRepository.create).toHaveBeenCalledWith({
         login: 'john',
         email: 'john@example.com',
         password: 'hashed-password',
         age: 30,
         firstName: 'John',
         lastName: 'Doe',
         description: 'desc',
      });
   });

   it('returns the current profile through the mapper', async () => {
      const entity = { id: 'user-id' };
      userRepository.findActiveOne.mockResolvedValue(entity);
      mapper.map.mockReturnValue({ id: 'user-id' });

      await expect(service.getMyProfile('user-id')).resolves.toEqual({ id: 'user-id' });

      expect(userRepository.findActiveOne).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(mapper.map).toHaveBeenCalledWith(entity, expect.any(Function), UserOutputDto);
   });

   it('updates only the current user profile', async () => {
      const entity = { id: 'user-id', firstName: 'John' };
      const updatedEntity = { ...entity, firstName: 'Jane' };
      userRepository.findActiveOne.mockResolvedValue(entity);
      userRepository.save.mockResolvedValue(updatedEntity);
      mapper.map.mockReturnValue({ id: 'user-id', firstName: 'Jane' });

      await expect(
         service.update(
            'user-id',
            'user-id',
            {
               firstName: 'Jane',
            } as UpdateUserInputDto,
         ),
      ).resolves.toEqual({ id: 'user-id', firstName: 'Jane' });

      expect(userRepository.findActiveOne).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(userRepository.save).toHaveBeenCalledWith({
         id: 'user-id',
         firstName: 'Jane',
      });
   });

   it('rejects updates for another user profile', async () => {
      await expect(
         service.update(
            'target-user-id',
            'current-user-id',
            {
               firstName: 'Jane',
            } as UpdateUserInputDto,
         ),
      ).rejects.toThrow('You can only manage your own user profile');

      expect(userRepository.findActiveOne).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
   });

   it('deletes only the current user profile', async () => {
      userRepository.findActiveOne.mockResolvedValue({ id: 'user-id' });
      userRepository.softDelete.mockResolvedValue({ affected: 1 });

      await expect(service.delete('user-id', 'user-id')).resolves.toBe(true);

      expect(userRepository.findActiveOne).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(userRepository.softDelete).toHaveBeenCalledWith('user-id');
   });

   it('rejects deleting another user profile', async () => {
      await expect(service.delete('target-user-id', 'current-user-id')).rejects.toThrow(
         'You can only manage your own user profile',
      );

      expect(userRepository.findActiveOne).not.toHaveBeenCalled();
      expect(userRepository.softDelete).not.toHaveBeenCalled();
   });
});
