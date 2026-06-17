const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Update 'production' to 'quality_checker'
    const res1 = await User.updateMany({ role: 'production' }, { role: 'quality_checker' });
    console.log(`Updated ${res1.modifiedCount} users from 'production' to 'quality_checker'`);

    // Update 'guard' to 'gate_guard'
    const res2 = await User.updateMany({ role: 'guard' }, { role: 'gate_guard' });
    console.log(`Updated ${res2.modifiedCount} users from 'guard' to 'gate_guard'`);

    console.log('Migration completed!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
