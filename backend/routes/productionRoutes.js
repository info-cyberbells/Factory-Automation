const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlans,
  createWipBatch,
  getWipBatches,
  updateWipStage,
  getProductionStats
} = require('../controllers/productionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth
router.use(protect);

// Dashboard stats
router.get('/stats', getProductionStats);

// Planning Routes (Supervisor+)
router.route('/plans')
  .get(getPlans)
  .post(authorize('super_admin', 'admin', 'supervisor', 'production'), createPlan);

// WIP Batch Routes
router.route('/wip')
  .get(getWipBatches)
  .post(authorize('super_admin', 'admin', 'supervisor', 'production'), createWipBatch); // Material Issue

// Stage Update (Production+)
router.put('/wip/:id/stage', authorize('super_admin', 'admin', 'supervisor', 'production'), updateWipStage);

module.exports = router;
