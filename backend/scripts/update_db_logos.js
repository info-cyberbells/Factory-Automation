const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Organization = require('../models/Organization');

async function updateLogos() {
  try {
    // const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/str-drg-erp'; // fallback
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackbells-erp'; // fallback
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');

    // Update settings.logo for all organizations
    const result = await Organization.updateMany(
      { 
        $or: [
          { 'settings.logo': '🏭' },
          { 'settings.logo': { $exists: false } },
          { 'settings.logo': null },
          { 'settings.logo': '' },
          { 'settings.logo': { $regex: /str-dr/i } }
        ]
      },
      {
        $set: { 'settings.logo': '/logo.png' }
      }
    );

    console.log(`Updated ${result.modifiedCount} organizations' logo settings to '/logo.png'.`);
    process.exit(0);
  } catch (err) {
    console.error('Database update failed:', err);
    process.exit(1);
  }
}

updateLogos();
