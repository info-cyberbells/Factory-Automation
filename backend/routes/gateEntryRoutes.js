const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload path
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});
const upload = multer({ storage });

const {
  createGateEntry,
  getGateEntries,
  getGateEntry,
  updateGateEntry,
  deleteGateEntry,
  verifyGateEntry,
  createGRN,
  getGateEntryStats
} = require('../controllers/gateEntryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(protect);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', getGateEntryStats);

// CRUD
router.route('/')
  .get(getGateEntries)
  .post(authorize('gate_guard', 'supervisor', 'admin', 'super_admin'), upload.single('invoiceFile'), createGateEntry);

router.route('/:id')
  .get(getGateEntry)
  .put(authorize('gate_guard', 'supervisor', 'admin', 'super_admin'), updateGateEntry)
  .delete(authorize('admin', 'super_admin'), deleteGateEntry);

// Actions
router.put('/:id/verify', authorize('supervisor', 'admin', 'super_admin'), verifyGateEntry);
router.put('/:id/create-grn', authorize('store_manager', 'supervisor', 'admin', 'super_admin'), createGRN);

module.exports = router;
