const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  getVendors,
  addVendor,
  getPOs,
  createPO,
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
router.route('/pos')
  .get(getPOs)
  .post(authorize('super_admin', 'admin'), createPO);

// Invoices & OCR
router.route('/invoices')
  .get(getInvoices);
  
router.post('/scan-invoice', authorize('super_admin', 'admin'), upload.single('file'), scanInvoice);

module.exports = router;
