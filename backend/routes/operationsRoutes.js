const express = require('express');
const router = express.Router();
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getBuildJobs,
  createBuildJob,
  updateBuildJob,
  sendToStore,
  receiveBuildProduct,
  getQualityLogs,
  createQualityLog,
  verifyQualityLog,
  updateQualityLog,
  deleteQualityLog,
  getShortageBuySales,
  createShortageBuySale,
  updateShortageBuySale,
  deleteShortageBuySale
} = require('../controllers/operationsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth
router.use(protect);

// Unified Inventory CRUD (Store Manager can edit, others can view/verify)
router.route('/inventory')
  .get(getInventory)
  .post(authorize('super_admin', 'admin', 'store_manager'), createInventoryItem);

router.route('/inventory/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'sales'), updateInventoryItem)
  .delete(authorize('super_admin', 'admin', 'store_manager'), deleteInventoryItem);

// Machine CRUD (Supervisor/Admins can edit)
router.route('/machines')
  .get(getMachines)
  .post(authorize('super_admin', 'admin', 'supervisor'), createMachine);

router.route('/machines/:id')
  .put(authorize('super_admin', 'admin', 'supervisor'), updateMachine)
  .delete(authorize('super_admin', 'admin', 'supervisor'), deleteMachine);

// Build Jobs (Sales & Store Manager can create, Supervisor updates, Store Manager completes handshake)
router.route('/build-jobs')
  .get(getBuildJobs)
  .post(authorize('super_admin', 'admin', 'sales', 'store_manager'), createBuildJob);

router.route('/build-jobs/:id')
  .put(authorize('super_admin', 'admin', 'supervisor'), updateBuildJob);

router.put('/build-jobs/:id/send-to-store', authorize('super_admin', 'admin', 'supervisor'), sendToStore);
router.put('/build-jobs/:id/receive', authorize('super_admin', 'admin', 'store_manager'), receiveBuildProduct);

// Quality Checker Logs (Quality Checker can CRUD, Store Manager & Sales can verify / update)
router.route('/qc-logs')
  .get(getQualityLogs)
  .post(authorize('super_admin', 'admin', 'quality_checker'), createQualityLog);

router.route('/qc-logs/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'sales', 'quality_checker'), updateQualityLog)
  .delete(authorize('super_admin', 'admin', 'store_manager', 'sales', 'quality_checker'), deleteQualityLog);

router.put('/qc-logs/:id/verify', authorize('super_admin', 'admin', 'store_manager', 'sales'), verifyQualityLog);

// Shortage & Buy/Sale Log CRUD (Store Manager can edit, others can view/assign)
router.route('/shortage-buy-sales')
  .get(getShortageBuySales)
  .post(authorize('super_admin', 'admin', 'store_manager', 'sales'), createShortageBuySale);

router.route('/shortage-buy-sales/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'sales'), updateShortageBuySale)
  .delete(authorize('super_admin', 'admin', 'store_manager', 'sales'), deleteShortageBuySale);

module.exports = router;
