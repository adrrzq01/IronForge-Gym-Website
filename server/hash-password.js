const bcrypt = require('bcryptjs');
const saltRounds = 10;
const plainPassword = 'password123';

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        throw err;
    }
    console.log('Hashed password:', hash);
});
