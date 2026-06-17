const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Organization = require('../models/Organization');

dotenv.config({ path: 'backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for migration...');
    
    const orgs = await Organization.find();
    for (const org of orgs) {
      if (org.settings && org.settings.menus) {
        org.settings.menus = org.settings.menus.filter(m => m.key !== 'dashboard');
        org.markModified('settings');
        await org.save();
        console.log(`Removed dashboard menu from organization: ${org.name}`);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration Error:', err.message);
    process.exit(1);
  }
};

run();
