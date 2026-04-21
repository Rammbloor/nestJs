import { AutoMap } from '@automapper/classes';
import {
   Column,
   CreateDateColumn,
   DeleteDateColumn,
   Entity,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
   @AutoMap()
   @PrimaryGeneratedColumn('uuid')
   id: string;

   @AutoMap()
   @Column({ unique: true })
   email: string;

   @AutoMap()
   @Column({ unique: true })
   login: string;

   @AutoMap()
   @Column()
   firstName: string;

   @AutoMap()
   @Column()
   lastName: string;

   @AutoMap()
   @Column()
   password: string;

   @AutoMap()
   @Column()
   age: number;

   @AutoMap()
   @Column({ length: 1000 })
   description: string;

   @AutoMap()
   @CreateDateColumn()
   createdAt: Date;

   @AutoMap()
   @UpdateDateColumn()
   updatedAt: Date;

   @AutoMap()
   @DeleteDateColumn()
   deletedAt: Date;
}
