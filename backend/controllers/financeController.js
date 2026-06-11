const axios = require('axios');
const FormData = require('form-data');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');

// @desc    Get all vendors
exports.getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

// @desc    Add a vendor
exports.addVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

// @desc    Get POs
exports.getPOs = async (req, res, next) => {
  try {
    const pos = await PurchaseOrder.find().populate('vendorId', 'vendorName');
    res.status(200).json({ success: true, data: pos });
  } catch (error) { next(error); }
};

// @desc    Create PO
exports.createPO = async (req, res, next) => {
  try {
    const { vendorId, materialType, quantityKg, ratePerKg } = req.body;
    const totalAmount = quantityKg * ratePerKg;
    const po = await PurchaseOrder.create({ vendorId, materialType, quantityKg, ratePerKg, totalAmount });
    res.status(201).json({ success: true, data: po });
  } catch (error) { next(error); }
};

// @desc    Scan Invoice via Python AI OCR
// @route   POST /api/finance/scan-invoice
exports.scanInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image/pdf file' });
    }

    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    
    const form = new FormData();
    form.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(`${pythonApiUrl}/ocr/scan-invoice`, form, {
      headers: { ...form.getHeaders() }
    });

    const aiData = response.data;

    const invoice = await Invoice.create({
      invoiceNumber: aiData.invoice_number,
      vendorName: aiData.vendor_name,
      totalAmount: aiData.total_amount,
      taxAmount: aiData.tax_amount,
      rawOcrText: aiData.raw_text
    });

    res.status(200).json({ success: true, data: invoice, aiExtracted: aiData });
  } catch (error) {
    console.error('OCR Error:', error.message);
    res.status(500).json({ success: false, message: 'AI OCR failed' });
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (error) { next(error); }
};
