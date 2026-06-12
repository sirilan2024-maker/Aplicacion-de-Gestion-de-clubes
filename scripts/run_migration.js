import fs from 'fs';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  if (!connectionString) {
    console.error('DATABASE_URL not found in env');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const sql = fs.readFileSync('supabase/migrations/20260610205422_training_metrics.sql', 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully');
    
    // Check if we need to insert default metrics for the active club
    const res = await client.query(`SELECT id FROM clubs LIMIT 1`);
    if (res.rows.length > 0) {
       const clubId = res.rows[0].id;
       await client.query(`
         INSERT INTO club_metrics (club_id, name, unit, type, is_active)
         VALUES 
           ($1, 'RPE', '1-10', 'number', true),
           ($1, 'Minutos', 'min', 'number', true)
         ON CONFLICT DO NOTHING;
       `, [clubId]);
       console.log('Default metrics seeded.');
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
