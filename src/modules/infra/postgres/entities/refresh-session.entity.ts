import {
   Column,
   CreateDateColumn,
   Entity,
   PrimaryGeneratedColumn,
   UpdateDateColumn,
} from 'typeorm';

@Entity('refresh_sessions')
export class RefreshSessionEntity {
   @PrimaryGeneratedColumn('uuid')
   id: string;

   @Column({ type: 'uuid' })
   userId: string;

   @Column({ type: 'uuid', unique: true })
   tokenId: string;

   @Column({ type: 'timestamp' })
   expiresAt: Date;

   @Column({ type: 'timestamp', nullable: true })
   revokedAt: Date | null;

   @Column({ type: 'varchar', length: 255, nullable: true })
   ipAddress: string | null;

   @Column({ type: 'varchar', length: 1024, nullable: true })
   userAgent: string | null;

   @CreateDateColumn()
   createdAt: Date;

   @UpdateDateColumn()
   updatedAt: Date;
}
