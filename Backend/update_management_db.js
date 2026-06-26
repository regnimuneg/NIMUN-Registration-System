import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log("Connected to database");
  
  const updateQuery = `
    UPDATE members 
    SET permissions = permissions - 'manage_members' - 'manage_delegates'
    WHERE id NOT IN ('EX-01', 'EX-03') AND id NOT LIKE 'ADMIN-%';
  `;
  
  const res = await client.query(updateQuery);
  console.log(`Updated ${res.rowCount} members, removing their management privileges.`);
  
  await client.end();
}

run().catch(console.error);
