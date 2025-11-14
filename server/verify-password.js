const bcrypt = require('bcryptjs');

const plainPassword = 'password123';
const hashedPasswordFromDB = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

const isMatch = bcrypt.compareSync(plainPassword, hashedPasswordFromDB);

console.log('Password match:', isMatch);
