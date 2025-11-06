const bcrypt = require('bcrypt');
const db = require('./models/db');

async function addAdmin(username, password) {
  const hash = await bcrypt.hash(password, 10);
  await db.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
  console.log('Admin ajouté:', username);
  process.exit();
}

const [,, username, password] = process.argv;
if (!username || !password) {
  console.log('Usage: node add_admin.js <username> <password>');
  process.exit(1);
}
addAdmin(username, password);
