const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Organization = require('../models/Organization');
const GateEntry = require('../models/GateEntry');
const InventoryItem = require('../models/InventoryItem');

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected successfully!');

    const orgs = await Organization.find();
    console.log('\n--- ORGANIZATIONS ---');
    console.log(`Total Orgs: ${orgs.length}`);
    orgs.forEach(o => {
      console.log(`ID: ${o._id} | Name: ${o.name} | Status: ${o.status}`);
    });

    const users = await User.find();
    console.log('\n--- USERS ---');
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => {
      console.log(`ID: ${u._id} | Name: ${u.name} | Role: ${u.role} | OrgId: ${u.organizationId}`);
    });

    // We bypass the tenantPlugin on GateEntry by using mongoose.connection.db or checking raw collection counts
    const rawGateCount = await mongoose.connection.db.collection('gateentries').countDocuments();
    console.log(`\nRaw Gate Entries in DB: ${rawGateCount}`);
    const sampleGates = await mongoose.connection.db.collection('gateentries').find().limit(5).toArray();
    sampleGates.forEach(g => {
      console.log(`Gate Entry ID: ${g._id} | Bill: ${g.billNumber} | OrgId: ${g.organizationId}`);
    });

    const rawInventoryCount = await mongoose.connection.db.collection('inventoryitems').countDocuments();
    console.log(`\nRaw Inventory Items in DB: ${rawInventoryCount}`);
    const sampleInv = await mongoose.connection.db.collection('inventoryitems').find().limit(5).toArray();
    sampleInv.forEach(i => {
      console.log(`Inv Item ID: ${i._id} | Name: ${i.name} | OrgId: ${i.organizationId}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
