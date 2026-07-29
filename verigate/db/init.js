const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'verigate.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

function bootstrap() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      min_role TEXT NOT NULL DEFAULT 'member'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL DEFAULT (datetime('now')),
      actor TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      ip TEXT,
      detail TEXT
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const insert = db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    );
    insert.run('root', bcrypt.hashSync('Root@98765', 12), 'admin');
    insert.run('jordan', bcrypt.hashSync('Member@456', 12), 'member');
  }

  const resourceCount = db.prepare('SELECT COUNT(*) AS c FROM resources').get().c;
  if (resourceCount === 0) {
    const insert = db.prepare(
      'INSERT INTO resources (title, body, min_role) VALUES (?, ?, ?)'
    );
    insert.run(
      'Welcome Packet',
      'General onboarding info available to every verified member.',
      'member'
    );
    insert.run(
      'Facility Access Schedule',
      'Building hours and access-card zones for the current term.',
      'member'
    );
    insert.run(
      'Internal Security Review',
      'Admin-only summary of the last vulnerability assessment.',
      'admin'
    );
    insert.run(
      'Budget Ledger',
      'Admin-only quarterly budget breakdown.',
      'admin'
    );
  }
}

bootstrap();

module.exports = db;
