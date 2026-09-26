import fs from 'fs';
import path from 'path';
import { pool } from './db';

// Runs backend/migrations/*.sql in name order. Every migration must be idempotent,
// because they all run on each start. Resolves the same folder from src/ and dist/.
export async function runMigrations(): Promise<void> {
  const dir = path.join(__dirname, '../../migrations');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    console.log(`🗄️  Migration applied: ${file}`);
  }
}
