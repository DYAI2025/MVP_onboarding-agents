const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigrations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ DB connected');
    
    const migrationsDir = path.join(__dirname, 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`\nFound ${files.length} migrations:`, files);
    
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`\nApplying ${file}...`);
      try {
        await client.query(sql);
        console.log(`✅ ${file} applied`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  ${file} already applied (skipped)`);
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✅ All migrations applied successfully');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();
