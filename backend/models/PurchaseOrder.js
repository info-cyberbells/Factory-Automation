const mongoose = require('mongoose');

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  materialType: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  ratePerKg: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Received'], default: 'Pending' },
  pdfUrl: { type: String }
}, { timestamps: true });

const tenantPlugin = require('../utils/tenantPlugin');
PurchaseOrderSchema.plugin(tenantPlugin);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
