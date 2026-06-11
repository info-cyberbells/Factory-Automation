const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Inventory item name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['raw_material', 'finished_good', 'hardware', 'custom'],
    required: true,
    default: 'raw_material'
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'kg'
  },
  location: {
    type: String,
    trim: true,
    default: 'Unassigned'
  },
  size: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

InventoryItemSchema.index({ type: 1 });
InventoryItemSchema.index({ name: 1 });
InventoryItemSchema.index({ location: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
InventoryItemSchema.plugin(tenantPlugin);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
