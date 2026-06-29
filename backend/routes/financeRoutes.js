const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  getVendors,
  addVendor,
  getPOs,
  createPO,
  getPOPDF,
  scanInvoice,
  getInvoices
} = require('../controllers/financeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Vendors
router.route('/vendors')
  .get(getVendors)
  .post(authorize('super_admin', 'admin'), addVendor);

// Purchase Orders
router.get('/pos/:id/pdf', getPOPDF);
router.route('/pos')
  .get(getPOs)
  .post(authorize('super_admin', 'admin'), createPO);

// Invoices & OCR
router.route('/invoices')
  .get(getInvoices);
  
router.post('/scan-invoice', authorize('super_admin', 'admin', 'sales'), upload.single('file'), scanInvoice);

module.exports = router;
