import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB");
    const sqlPath = path.join(__dirname, '../../db/reset_schema_for_reseed.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Running reset schema...");
    await client.query(sql);
    console.log("Reset successful.");
  } catch(err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
