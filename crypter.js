const bcrypt = require('bcryptjs');
bcrypt.hash('SIAKOU2006', 12).then(hash => console.log(hash));
