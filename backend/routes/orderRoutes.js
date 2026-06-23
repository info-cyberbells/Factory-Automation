const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getShortageReports,
  planShortageProduction,
  dispatchOrder,
  getOrderStats,
  getOrderPDF
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/stats', getOrderStats);
router.get('/:id/pdf', getOrderPDF);

router.route('/')
  .get(getOrders)
  .post(authorize('super_admin', 'admin', 'sales', 'orders'), createOrder);

router.get('/shortages', authorize('super_admin', 'admin', 'supervisor', 'sales', 'orders'), getShortageReports);
router.post('/shortages/:id/plan', authorize('super_admin', 'admin', 'supervisor', 'orders'), planShortageProduction);

router.post('/:id/dispatch', authorize('super_admin', 'admin', 'sales', 'store_manager', 'orders'), dispatchOrder);

module.exports = router;
