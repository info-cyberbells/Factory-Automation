const mongoose = require('mongoose');

const GateEntrySchema = new mongoose.Schema({
  // Bill Information
  billNumber: {
    type: String,
    required: [true, 'Bill number is required'],
    unique: true,
    trim: true
  },
  billDate: {
    type: Date,
    required: [true, 'Bill date is required'],
    default: Date.now
  },

  // Vendor / Supplier
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  vendorContact: {
    type: String,
    trim: true
  },

  // Material Details
  materialType: {
    type: String,
    required: [true, 'Material type is required'],
    enum: ['nylon', 'pigment', 'packaging', 'hardware', 'other'],
    default: 'nylon'
  },
  materialDescription: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'pcs', 'meters', 'liters', 'bags', 'boxes'],
    default: 'kg'
  },

  // Vehicle Details
  vehicleNumber: {
    type: String,
    trim: true
  },
  driverName: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'verified', 'grn_created', 'rejected'],
    default: 'pending'
  },

  // GRN Info (filled when GRN is created)
  grnNumber: {
    type: String,
    trim: true
  },
  grnDate: {
    type: Date
  },
  receivedQuantity: {
    type: Number,
    min: 0
  },
  qualityStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partial'],
    default: 'pending'
  },
  remarks: {
    type: String,
    trim: true
  },

  invoiceUrl: {
    type: String,
    trim: true
  },

  // Who logged it
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate GRN number
GateEntrySchema.pre('save', async function() {
  if (this.status === 'grn_created' && !this.grnNumber) {
    const count = await mongoose.model('GateEntry').countDocuments({ grnNumber: { $exists: true, $ne: null } });
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    this.grnNumber = `GRN-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    this.grnDate = new Date();
  }
});

// Index for fast queries
// GateEntrySchema.index({ billNumber: 1 });
GateEntrySchema.index({ status: 1 });
GateEntrySchema.index({ createdAt: -1 });
GateEntrySchema.index({ vendorName: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
GateEntrySchema.plugin(tenantPlugin);

module.exports = mongoose.model('GateEntry', GateEntrySchema);
