const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');

dotenv.config();

const rolesToSeed = [
  { role: 'admin', email: 'admin@trackbells.com', name: 'TrackBells Admin' },
  { role: 'store_manager', email: 'store@trackbells.com', name: 'TrackBells Store Manager' },
  { role: 'sales', email: 'sales@trackbells.com', name: 'TrackBells Sales Officer' },
  { role: 'supervisor', email: 'supervisor@trackbells.com', name: 'TrackBells Supervisor' },
  { role: 'gate_guard', email: 'guard@trackbells.com', name: 'TrackBells Gate Guard' },
  { role: 'quality_checker', email: 'quality@trackbells.com', name: 'TrackBells Quality Checker' }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Find the default organization TrackBells HQ
    let org = await Organization.findOne({ name: 'TrackBells HQ' });
    if (!org) {
      org = await Organization.findOne();
    }

    if (!org) {
      console.error('No organization found in database. Please run seed:admin first.');
      process.exit(1);
    }

    console.log(`Seeding users under organization: ${org.name} (${org._id})`);

    for (const r of rolesToSeed) {
      // Remove if already exists to prevent duplicate key errors
      await User.deleteOne({ email: r.email });

      const newUser = await User.create({
        name: r.name,
        email: r.email,
        password: '112233',
        role: r.role,
        phone: '9999999999',
        department: 'Production',
        isActive: true,
        organizationId: org._id
      });
      console.log(`Created user: ${newUser.email} with role: ${newUser.role}`);
    }

    console.log('All roles seeded successfully! Password is: 112233');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
