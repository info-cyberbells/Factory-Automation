const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI env variable is missing!');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully!');

    const db = mongoose.connection.db;

    // 1. Get or create the default organization
    let defaultOrg = await db.collection('organizations').findOne({ name: 'TrackBells HQ' });
    if (!defaultOrg) {
      defaultOrg = await db.collection('organizations').findOne();
    }
    
    if (!defaultOrg) {
      console.log('No organization found. Creating default "TrackBells HQ"...');
      const result = await db.collection('organizations').insertOne({
        name: 'TrackBells HQ',
        industry: 'Manufacturing',
        contactEmail: 'admin@trackbells.com',
        verified: true,
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      defaultOrg = { _id: result.insertedId, name: 'TrackBells HQ' };
    }

    console.log(`Using default organization: ${defaultOrg.name} (${defaultOrg._id})`);

    // List of collections that store tenant-specific data
    const tenantCollections = [
      'gateentries',
      'inventoryitems',
      'machines',
      'buildjobs',
      'qualitylogs',
      'shortagebuysales',
      'notifications',
      'users'
    ];

    for (const colName of tenantCollections) {
      console.log(`\nMigrating collection: "${colName}"...`);
      
      // Find count of orphaned documents
      const orphanCount = await db.collection(colName).countDocuments({
        $or: [
          { organizationId: { $exists: false } },
          { organizationId: null }
        ]
      });

      console.log(`Found ${orphanCount} orphaned documents.`);

      if (orphanCount > 0) {
        const result = await db.collection(colName).updateMany(
          {
            $or: [
              { organizationId: { $exists: false } },
              { organizationId: null }
            ]
          },
          {
            $set: { organizationId: defaultOrg._id }
          }
        );
        console.log(`Successfully migrated ${result.modifiedCount} documents.`);
      } else {
        console.log('No documents needed migration.');
      }
    }

    console.log('\n==================================================');
    console.log('🎉 Database tenant migration completed successfully!');
    console.log('==================================================');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

run();
