const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
connectDB().then(async () => {
  try {
    const User = require('./models/User');
    const GateEntry = require('./models/GateEntry');
    const BuildJob = require('./models/BuildJob');
    const QualityLog = require('./models/QualityLog');
    const ShortageBuySale = require('./models/ShortageBuySale');
    const SupportTicket = require('./models/SupportTicket');

    const email = 'guard@strdrg.com';
    console.log('Finding user...');
    const userRecord = await User.findOne({ email });
    console.log('User record:', userRecord);

    if (userRecord) {
      console.log('Counting gate entries...');
      const pendingGate = await GateEntry.countDocuments({ status: 'pending' });
      const totalGate = await GateEntry.countDocuments();
      console.log('Pending Gate:', pendingGate, 'Total Gate:', totalGate);
    } else {
      console.log('User not found in database!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error occurred:');
    console.error(err);
    process.exit(1);
  }
});
