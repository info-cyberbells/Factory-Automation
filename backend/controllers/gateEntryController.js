const GateEntry = require('../models/GateEntry');
const Material = require('../models/Material');

// @desc    Create gate entry
// @route   POST /api/gate-entry
// @access  Private (guard, supervisor, admin, super_admin)
exports.createGateEntry = async (req, res, next) => {
  try {
    const entryData = {
      ...req.body,
      loggedBy: req.user._id
    };

    if (req.file) {
      entryData.invoiceUrl = `/uploads/${req.file.filename}`;
    }

    const entry = await GateEntry.create(entryData);

    res.status(201).json({
      success: true,
      message: 'Gate entry created successfully',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all gate entries with pagination, search, filter
// @route   GET /api/gate-entry
// @access  Private
exports.getGateEntries = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status,
      materialType,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { grnNumber: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (materialType) filter.materialType = materialType;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const total = await GateEntry.countDocuments(filter);
    const entries = await GateEntry.find(filter)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single gate entry
// @route   GET /api/gate-entry/:id
// @access  Private
exports.getGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id)
      .populate('loggedBy', 'name role email')
      .populate('verifiedBy', 'name role email');

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Update gate entry
// @route   PUT /api/gate-entry/:id
// @access  Private
exports.updateGateEntry = async (req, res, next) => {
  try {
    let entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    // Don't allow editing GRN-created entries (only remarks)
    if (entry.status === 'grn_created' && req.body.status !== 'grn_created') {
      return res.status(400).json({ success: false, message: 'Cannot modify entry after GRN is created' });
    }

    entry = await GateEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('loggedBy', 'name role').populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Gate entry updated successfully',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete gate entry
// @route   DELETE /api/gate-entry/:id
// @access  Private (admin, super_admin)
exports.deleteGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status === 'grn_created') {
      return res.status(400).json({ success: false, message: 'Cannot delete entry with GRN' });
    }

    await GateEntry.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Gate entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify gate entry (supervisor verifies guard's entry)
// @route   PUT /api/gate-entry/:id/verify
// @access  Private (supervisor, admin, super_admin)
exports.verifyGateEntry = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Entry is already processed' });
    }

    entry.status = 'verified';
    entry.verifiedBy = req.user._id;
    if (req.body.remarks) {
      entry.remarks = req.body.remarks;
    }
    await entry.save();

    const updated = await GateEntry.findById(entry._id)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Gate entry verified successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create GRN from verified gate entry
// @route   PUT /api/gate-entry/:id/create-grn
// @access  Private (store_manager, supervisor, admin, super_admin)
exports.createGRN = async (req, res, next) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Gate entry not found' });
    }

    if (entry.status === 'grn_created') {
      return res.status(400).json({ success: false, message: 'GRN already created for this entry' });
    }

    const { receivedQuantity, qualityStatus, remarks } = req.body;

    // Update gate entry to GRN created
    entry.status = 'grn_created';
    entry.receivedQuantity = receivedQuantity || entry.quantity;
    entry.qualityStatus = qualityStatus || 'approved';
    entry.remarks = remarks || '';
    entry.verifiedBy = entry.verifiedBy || req.user._id;
    await entry.save();

    // Update or create material inventory
    if (entry.qualityStatus !== 'rejected') {
      let material = await Material.findOne({
        name: entry.materialType,
        type: entry.materialType
      });

      if (!material) {
        material = new Material({
          name: entry.materialType.charAt(0).toUpperCase() + entry.materialType.slice(1),
          type: entry.materialType,
          unit: entry.unit,
          currentStock: 0,
          totalInward: 0,
          totalIssued: 0
        });
      }

      const addQty = entry.receivedQuantity || entry.quantity;
      material.currentStock += addQty;
      material.totalInward += addQty;
      material.lastGateEntry = entry._id;
      material.lastUpdated = new Date();
      await material.save();
    }

    const updated = await GateEntry.findById(entry._id)
      .populate('loggedBy', 'name role')
      .populate('verifiedBy', 'name role');

    res.status(200).json({
      success: true,
      message: `GRN ${updated.grnNumber} created successfully. Inventory updated.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get gate entry stats
// @route   GET /api/gate-entry/stats
// @access  Private
exports.getGateEntryStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEntries, pendingEntries, todayEntries, grnCreated] = await Promise.all([
      GateEntry.countDocuments(),
      GateEntry.countDocuments({ status: 'pending' }),
      GateEntry.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      GateEntry.countDocuments({ status: 'grn_created' })
    ]);

    // Total material received today
    const todayMaterial = await GateEntry.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    // Material by type
    const materialByType = await GateEntry.aggregate([
      { $match: { status: 'grn_created' } },
      { $group: { _id: '$materialType', total: { $sum: '$receivedQuantity' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEntries,
        pendingEntries,
        todayEntries,
        grnCreated,
        todayMaterialQty: todayMaterial[0]?.total || 0,
        materialByType
      }
    });
  } catch (error) {
    next(error);
  }
};
