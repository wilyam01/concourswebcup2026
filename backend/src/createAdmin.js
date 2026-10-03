import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { newId } from './auth.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 12 || password.length > 72) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12–72 characters) in the environment.');
  process.exit(1);
}
const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
if (existing) {
  db.prepare("UPDATE users SET role='ADMIN',enabled=1 WHERE id=?").run(existing.id);
  console.log(`Granted ADMIN to ${email}`);
} else {
  db.prepare('INSERT INTO users(id,email,display_name,sector,password_hash,role) VALUES(?,?,?,?,?,?)')
    .run(newId(), email, process.env.ADMIN_DISPLAY_NAME?.trim() || 'Administrateur', '', await bcrypt.hash(password, 12), 'ADMIN');
  console.log(`Created ADMIN account ${email}`);
}
