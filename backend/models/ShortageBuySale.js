const mongoose = require('mongoose');

const ShortageBuySaleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['shortage', 'buy', 'sale'],
    required: true
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be positive']
  },
  unit: {
    type: String,
    required: true,
    default: 'pcs'
  },
  assignedTo: {
    type: String,
    enum: ['supervisor', 'sales', 'gate_guard', 'quality_checker', 'store_manager', 'unassigned'],
    default: 'unassigned'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'ordered', 'completed'],
    default: 'pending'
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

ShortageBuySaleSchema.index({ type: 1 });
ShortageBuySaleSchema.index({ status: 1 });
ShortageBuySaleSchema.index({ assignedTo: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
ShortageBuySaleSchema.plugin(tenantPlugin);

module.exports = mongoose.model('ShortageBuySale', ShortageBuySaleSchema);
