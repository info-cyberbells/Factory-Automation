const mongoose = require('mongoose');

const MachineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Machine name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['working', 'broken', 'idle', 'running'],
    default: 'working'
  },
  capacity: {
    type: String,
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  powerRating: {
    type: String,
    trim: true
  },
  lastServiceDate: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

MachineSchema.index({ status: 1 });
MachineSchema.index({ name: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
MachineSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Machine', MachineSchema);
