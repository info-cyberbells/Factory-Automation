const mongoose = require('mongoose');

const MaterialSchema = new mongoose.Schema({
  // Material Identity
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['nylon', 'pigment', 'packaging', 'hardware', 'other'],
    default: 'nylon'
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'pcs', 'meters', 'liters', 'bags', 'boxes'],
    default: 'kg'
  },

  // Stock
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 10
  },

  // Tracking
  totalInward: {
    type: Number,
    default: 0
  },
  totalIssued: {
    type: Number,
    default: 0
  },

  // Source gate entry reference
  lastGateEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GateEntry'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual: is low stock
MaterialSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.minimumStock;
});

MaterialSchema.set('toJSON', { virtuals: true });
MaterialSchema.set('toObject', { virtuals: true });

MaterialSchema.index({ type: 1 });
MaterialSchema.index({ name: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
MaterialSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Material', MaterialSchema);
