const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    const users = await User.find().populate('organizationId', 'name');
    console.log('================================================================');
    console.log('List of Users in the Database:');
    console.log('================================================================');
    users.forEach(u => {
      console.log(`Email: ${u.email} | Role: ${u.role} | Org: ${u.organizationId?.name || 'None'}`);
    });
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
