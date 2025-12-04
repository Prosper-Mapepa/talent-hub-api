import { AppDataSource } from './config/data-source';

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log(`Migrations completed. ${migrations.length} migration(s) executed.`);
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();

