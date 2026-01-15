import { AppDataSource } from './config/data-source';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  // Check if database variables are set (strict check for undefined, null, or empty string)
  const dbHost = process.env.DB_HOST?.trim();
  const dbPort = process.env.DB_PORT?.trim();
  const dbUsername = process.env.DB_USERNAME?.trim();
  const dbPassword = process.env.DB_PASSWORD?.trim();
  const dbName = process.env.DB_NAME?.trim();

  console.log('🔍 Checking database environment variables...');
  console.log(`  DB_HOST: ${dbHost || '❌ NOT SET'}`);
  console.log(`  DB_PORT: ${dbPort || '❌ NOT SET'}`);
  console.log(`  DB_USERNAME: ${dbUsername || '❌ NOT SET'}`);
  console.log(`  DB_PASSWORD: ${dbPassword ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`  DB_NAME: ${dbName || '❌ NOT SET'}`);

  if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
    console.error('\n❌ Database environment variables are not set!');
    console.error(
      'Required variables: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME',
    );
    console.error('\n📋 How to fix:');
    console.error('1. Go to Railway → Your Backend Service → Variables tab');
    console.error("2. Add a PostgreSQL service if you haven't already");
    console.error('3. Link the PostgreSQL service to your backend service');
    console.error(
      '4. Or manually add these variables from your PostgreSQL service:',
    );
    console.error('   - DB_HOST (from PGHOST)');
    console.error('   - DB_PORT (from PGPORT)');
    console.error('   - DB_USERNAME (from PGUSER)');
    console.error('   - DB_PASSWORD (from PGPASSWORD)');
    console.error('   - DB_NAME (from PGDATABASE)');
    console.error('\n⚠️  The app cannot start without these variables!');
    process.exit(1);
  }

  // Check if trying to connect to localhost (common mistake)
  if (dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '::1') {
    console.error('\n❌ DB_HOST is set to localhost!');
    console.error(
      'This will not work in Railway. You need to use your Railway PostgreSQL host.',
    );
    console.error(
      'Please set DB_HOST to your Railway PostgreSQL service hostname.',
    );
    process.exit(1);
  }

  try {
    console.log('🔄 Running database migrations...');
    console.log(`   Connecting to: ${dbHost}:${dbPort}/${dbName}`);
    await AppDataSource.initialize();
    
    // Check if password reset fields exist before running migrations
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      const table = await queryRunner.getTable('users');
      const hasResetToken = table?.findColumnByName('reset_password_token');
      const hasResetExpires = table?.findColumnByName('reset_password_expires');
      
      if (!hasResetToken || !hasResetExpires) {
        console.log('⚠️  Password reset columns missing. Running migration manually...');
        await queryRunner.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) NULL,
          ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP NULL;
        `);
        console.log('✅ Password reset columns added successfully!');
      } else {
        console.log('✅ Password reset columns already exist.');
      }
    } finally {
      await queryRunner.release();
    }
    
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length > 0) {
      console.log(
        `✅ Migrations completed. ${migrations.length} migration(s) executed.`,
      );
      migrations.forEach((migration) => {
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
      console.error(
        '   1. Database environment variables are not set correctly',
      );
      console.error('   2. Database service is not running');
      console.error('   3. Database host/port is incorrect');
      console.error('\nPlease check your Railway database configuration.');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

runMigrations();
