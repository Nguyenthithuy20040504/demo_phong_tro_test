const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/phong_tro_db'); // Guessing DB URI, let's use the one from env
}
check();
