const Order = require('../models/Order');
const ShortageReport = require('../models/ShortageReport');
const { createNotification } = require('./notificationController');
const ChainInventory = require('../models/ChainInventory');
const ProductionPlan = require('../models/ProductionPlan');

// @desc    Create new order and auto-calculate shortage
// @route   POST /api/orders
// @access  Private (sales, admin, super_admin)
exports.createOrder = async (req, res, next) => {
  try {
    const { clientName, modelNumber, orderQuantity, deliveryDate } = req.body;

    // Generate Order Number
    const count = await Order.countDocuments();
    const orderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${(count+1).toString().padStart(3, '0')}`;

    // Calculate total stock for this model
    const inventory = await ChainInventory.aggregate([
      { $match: { modelNumber } },
      { $group: { _id: null, totalMeters: { $sum: '$quantityMeters' } } }
    ]);
    const totalStock = inventory.length > 0 ? inventory[0].totalMeters : 0;

    let status = 'ready';
    let shortageMeters = 0;

    if (totalStock < orderQuantity) {
      status = 'shortage';
      shortageMeters = orderQuantity - totalStock;
    }

    const order = await Order.create({
      orderNumber,
      clientName,
      modelNumber,
      orderQuantity,
      deliveryDate,
      status,
      createdBy: req.user._id
    });

    if (shortageMeters > 0) {
      await ShortageReport.create({
        orderId: order._id,
        modelNumber,
        shortageMeters
      });
    }

    res.status(201).json({ success: true, message: 'Order created', data: order, shortage: shortageMeters });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shortage reports (For Supervisor)
// @route   GET /api/orders/shortages
// @access  Private (supervisor, admin, super_admin)
exports.getShortageReports = async (req, res, next) => {
  try {
    const shortages = await ShortageReport.find()
      .populate('orderId', 'orderNumber clientName deliveryDate')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: shortages });
  } catch (error) {
    next(error);
  }
};

// @desc    Plan production for a shortage (Supervisor action)
// @route   POST /api/orders/shortages/:id/plan
// @access  Private (supervisor, admin, super_admin)
exports.planShortageProduction = async (req, res, next) => {
  try {
    const { plannedShots } = req.body;
    const shortage = await ShortageReport.findById(req.params.id).populate('orderId');

    if (!shortage) return res.status(404).json({ success: false, message: 'Shortage report not found' });
    if (shortage.status !== 'pending_planning') return res.status(400).json({ success: false, message: 'Production already planned' });

    // Create a new Production Plan (Phase 3 link)
    const plan = await ProductionPlan.create({
      modelNumber: shortage.modelNumber,
      orderReference: shortage.orderId.orderNumber,
      plannedShots,
      createdBy: req.user._id
    });

    shortage.status = 'production_planned';
    shortage.plannedShots = plannedShots;
    await shortage.save();

    res.status(200).json({ success: true, message: 'Production planned successfully', data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch order (Deduct from inventory)
// @route   POST /api/orders/:id/dispatch
// @access  Private (sales, store_manager, admin, super_admin)
exports.dispatchOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'dispatched') return res.status(400).json({ success: false, message: 'Order already dispatched' });

    // In a real system, we'd deduct specifically from certain bins.
    // For simplicity, we just deduct from the first available bins for that model.
    let remainingToDeduct = order.orderQuantity;
    const bins = await ChainInventory.find({ modelNumber: order.modelNumber, quantityMeters: { $gt: 0 } }).sort({ quantityMeters: -1 });

    let totalAvailable = bins.reduce((sum, b) => sum + b.quantityMeters, 0);
    if (totalAvailable < remainingToDeduct) {
      return res.status(400).json({ success: false, message: 'Insufficient stock to dispatch. Check inventory.' });
    }

    for (let bin of bins) {
      if (remainingToDeduct <= 0) break;
      if (bin.quantityMeters >= remainingToDeduct) {
        bin.quantityMeters -= remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= bin.quantityMeters;
        bin.quantityMeters = 0;
      }
      await bin.save();
    }

    order.status = 'dispatched';
    await order.save();

    // Optionally mark shortage as fulfilled if there was one
    await ShortageReport.updateMany({ orderId: order._id }, { status: 'fulfilled' });

    res.status(200).json({ success: true, message: 'Order dispatched and stock deducted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order stats
// @route   GET /api/orders/stats
// @access  Private
exports.getOrderStats = async (req, res, next) => {
  try {
    const [totalOrders, pendingOrders, shortageOrders, dispatchedOrders] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'shortage' }),
      Order.countDocuments({ status: 'dispatched' })
    ]);

    res.status(200).json({
      success: true,
      data: { totalOrders, pendingOrders, shortageOrders, dispatchedOrders }
    });
  } catch (error) {
    next(error);
  }
};
