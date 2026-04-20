import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshSessionsTable1776670000000 implements MigrationInterface {
   name = 'CreateRefreshSessionsTable1776670000000';

   public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(
         `CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_id" uuid NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_refresh_sessions_token_id" UNIQUE ("token_id"), CONSTRAINT "PK_refresh_sessions_id" PRIMARY KEY ("id"))`,
      );
      await queryRunner.query(
         `ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_refresh_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
         `CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id") `,
      );
      await queryRunner.query(
         `CREATE INDEX "IDX_refresh_sessions_expires_at" ON "refresh_sessions" ("expires_at") `,
      );
   }

   public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "public"."IDX_refresh_sessions_expires_at"`);
      await queryRunner.query(`DROP INDEX "public"."IDX_refresh_sessions_user_id"`);
      await queryRunner.query(
         `ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_refresh_sessions_user_id"`,
      );
      await queryRunner.query(`DROP TABLE "refresh_sessions"`);
   }
}
