const mongoose = require('mongoose');

const QualityLogSchema = new mongoose.Schema({
  materialName: {
    type: String,
    required: [true, 'Material name is required'],
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
  invoiceNumber: {
    type: String,
    trim: true
  },
  invoiceUrl: {
    type: String,
    trim: true
  },
  qcType: {
    type: String,
    enum: ['inspected', 'damaged', 'missed'],
    required: true,
    default: 'inspected'
  },
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'rejected'],
    default: 'pending_verification'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

QualityLogSchema.index({ qcType: 1 });
QualityLogSchema.index({ status: 1 });
QualityLogSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
QualityLogSchema.plugin(tenantPlugin);

module.exports = mongoose.model('QualityLog', QualityLogSchema);
