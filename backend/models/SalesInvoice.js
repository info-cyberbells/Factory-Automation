const mongoose = require('mongoose');

const SalesInvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 18 },
  amount: { type: Number, required: true }
});

const SalesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  clientName: { type: String, required: true },
  clientAddress: { type: String },
  clientGST: { type: String },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  items: [SalesInvoiceItemSchema],
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  notes: { type: String }
}, { timestamps: true });

const tenantPlugin = require('../utils/tenantPlugin');
SalesInvoiceSchema.plugin(tenantPlugin);

module.exports = mongoose.model('SalesInvoice', SalesInvoiceSchema);
