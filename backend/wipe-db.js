const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/.env' });

const wipeDB = async () => {
  try {
    // await mongoose.connect('mongodb://localhost:27017/str-drg-erp');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackbells-erp');
    console.log('MongoDB Connected. Dropping database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database completely wiped for fresh SaaS start!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

wipeDB();
