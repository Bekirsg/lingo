// Quick schema exploration of the GTS SQLite database
import Database from 'better-sqlite3';

const db = new Database(process.env.TEMP + '/gts.sqlite3.db', { readonly: true });

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

// For each table, show schema
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  console.log(`\n--- ${t.name} ---`);
  console.log(cols.map(c => `  ${c.name} (${c.type})`).join('\n'));
  
  // Show first 3 rows
  const rows = db.prepare(`SELECT * FROM "${t.name}" LIMIT 3`).all();
  console.log('Sample:', JSON.stringify(rows, null, 2).slice(0, 500));
}

db.close();
