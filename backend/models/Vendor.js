const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  gstNumber: { type: String },
  materialSupplied: { type: String, default: 'Nylon' },
  rating: { type: Number, default: 5, min: 1, max: 5 }
}, { timestamps: true });

const tenantPlugin = require('../utils/tenantPlugin');
VendorSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Vendor', VendorSchema);
