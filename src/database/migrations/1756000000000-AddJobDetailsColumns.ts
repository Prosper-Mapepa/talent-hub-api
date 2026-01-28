import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobDetailsColumns1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS requirements text[],
      ADD COLUMN IF NOT EXISTS responsibilities text[],
      ADD COLUMN IF NOT EXISTS benefits text[];
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE jobs 
      DROP COLUMN IF EXISTS requirements,
      DROP COLUMN IF EXISTS responsibilities,
      DROP COLUMN IF EXISTS benefits;
    `);
  }
}
