import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToRefreshSessionsTable1776671000000 implements MigrationInterface {
   name = 'AddMetadataToRefreshSessionsTable1776671000000';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `ALTER TABLE "refresh_sessions" ADD "ip_address" character varying(255)`,
      );
      await queryRunner.query(
         `ALTER TABLE "refresh_sessions" ADD "user_agent" character varying(1024)`,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE "refresh_sessions" DROP COLUMN "user_agent"`);
      await queryRunner.query(`ALTER TABLE "refresh_sessions" DROP COLUMN "ip_address"`);
   }
}
