import { AppDataSource } from './config/data-source';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  // Check if database variables are set
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT;
  const dbUsername = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
    console.error('❌ Database environment variables are not set!');
    console.error('Required variables: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME');
    console.error('Current values:');
    console.error(`  DB_HOST: ${dbHost || 'NOT SET'}`);
    console.error(`  DB_PORT: ${dbPort || 'NOT SET'}`);
    console.error(`  DB_USERNAME: ${dbUsername || 'NOT SET'}`);
    console.error(`  DB_PASSWORD: ${dbPassword ? '***' : 'NOT SET'}`);
    console.error(`  DB_NAME: ${dbName || 'NOT SET'}`);
    console.error('\nPlease set these variables in Railway before deploying.');
    process.exit(1);
  }

  try {
    console.log('🔄 Running database migrations...');
    console.log(`   Connecting to: ${dbHost}:${dbPort}/${dbName}`);
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(`✅ Migrations completed. ${migrations.length} migration(s) executed.`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    } else {
      console.log('✅ No pending migrations. Database is up to date.');
    }
    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error running migrations:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. This usually means:');
      console.error('   1. Database environment variables are not set correctly');
      console.error('   2. Database service is not running');
      console.error('   3. Database host/port is incorrect');
      console.error('\nPlease check your Railway database configuration.');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigrations();

