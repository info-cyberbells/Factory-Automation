const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Check if super_admin already exists
    const existing = await User.findOne({ role: 'super_admin' });
    if (existing) {
      console.log(`Super Admin already exists: ${existing.email}`);
      process.exit(0);
    }

    // Create Default Organization
    const defaultOrg = await Organization.create({
      name: 'TrackBells HQ',
      industry: 'Manufacturing',
      contactEmail: 'admin@trackbells.com',
      verified: true,
      status: 'approved'
    });

    // Create super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'aman.cyberbells@gmail.com',
      password: '112233',
      role: 'super_admin',
      phone: '9999999999',
      department: 'Management',
      isActive: true,
      organizationId: defaultOrg._id,
      isOrgOwner: true
    });

    console.log('========================================');
    console.log('  SUPER ADMIN CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`  Email:    ${superAdmin.email}`);
    console.log(`  Password: SuperAdmin@2026`);
    console.log(`  Role:     ${superAdmin.role}`);
    console.log('========================================');
    console.log('  ⚠️  Change the password after first login!');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
