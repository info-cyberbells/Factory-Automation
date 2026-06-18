const InventoryItem = require('../models/InventoryItem');
const Machine = require('../models/Machine');
const BuildJob = require('../models/BuildJob');
const QualityLog = require('../models/QualityLog');
const Notification = require('../models/Notification');
const ShortageBuySale = require('../models/ShortageBuySale');

// Helper to broadcast socket events
const broadcastToOrg = (req, eventName, payload) => {
  try {
    const io = req.app.get('io');
    const orgId = req.user.organizationId;
    if (io && orgId) {
      io.to(`org_${orgId}`).emit(eventName, payload);
      console.log(`Realtime Broadcast: ${eventName} sent to org_${orgId}`);
    }
  } catch (err) {
    console.error('Socket broadcast failed:', err);
  }
};

// Helper to create internal notification
const createInternalNotification = async (title, message, type, orgId) => {
  try {
    await Notification.create({ title, message, type, organizationId: orgId });
  } catch (err) {
    console.error('Notification creation failed:', err);
  }
};

// ==========================================
// UNIFIED INVENTORY
// ==========================================

exports.getInventory = async (req, res, next) => {
  try {
    const items = await InventoryItem.find().sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

exports.createInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.create(req.body);
    broadcastToOrg(req, 'inventory_updated', { action: 'create', item });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};


exports.updateInventoryItem = async (req, res, next) => {
  try {
    const oldItem = await InventoryItem.findById(req.params.id);
    if (!oldItem) return res.status(404).json({ success: false, message: 'Item not found' });

    // Validate that approved quantity does not exceed original quantity
    if (req.body.qualityStatus === 'verified' && typeof req.body.quantity === 'number') {
      if (req.body.quantity > oldItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Approved quantity (${req.body.quantity}) cannot exceed the original quantity (${oldItem.quantity})`
        });
      }
    }

    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // Automatically create a shortage if qualityStatus is verified and quantity is reduced
    if (req.body.qualityStatus === 'verified' && typeof req.body.quantity === 'number' && req.body.quantity < oldItem.quantity) {
      const shortageQty = oldItem.quantity - req.body.quantity;
      if (shortageQty > 0) {
        const shortage = await ShortageBuySale.create({
          type: 'shortage',
          itemName: item.name,
          quantity: shortageQty,
          unit: req.body.unit || item.unit,
          assignedTo: 'unassigned',
          status: 'pending',
          remarks: `Auto-created shortage from QC Audit Verification discrepancy. Inspected: ${oldItem.quantity}, Approved: ${req.body.quantity}. Remarks: ${req.body.qcRemarks || ''}`,
          organizationId: req.user.organizationId
        });

        await createInternalNotification(
          'QC Shortage Logged',
          `Shortage of ${shortageQty} ${req.body.unit || item.unit} created for item: ${item.name} due to QC discrepancy.`,
          'system',
          req.user.organizationId
        );

        broadcastToOrg(req, 'communication_updated', { action: 'create', item: shortage });
      }
    }

    broadcastToOrg(req, 'inventory_updated', { action: 'update', item });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    broadcastToOrg(req, 'inventory_updated', { action: 'delete', itemId: req.params.id });
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MACHINES
// ==========================================

exports.getMachines = async (req, res, next) => {
  try {
    const machines = await Machine.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: machines });
  } catch (error) {
    next(error);
  }
};

exports.createMachine = async (req, res, next) => {
  try {
    const machine = await Machine.create(req.body);
    broadcastToOrg(req, 'machine_updated', { action: 'create', machine });
    res.status(201).json({ success: true, data: machine });
  } catch (error) {
    next(error);
  }
};

exports.updateMachine = async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    broadcastToOrg(req, 'machine_updated', { action: 'update', machine });
    res.status(200).json({ success: true, data: machine });
  } catch (error) {
    next(error);
  }
};

exports.deleteMachine = async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ success: false, message: 'Machine not found' });
    broadcastToOrg(req, 'machine_updated', { action: 'delete', machineId: req.params.id });
    res.status(200).json({ success: true, message: 'Machine deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BUILD JOBS
// ==========================================

exports.getBuildJobs = async (req, res, next) => {
  try {
    // Dynamically mark past estimatedDate jobs as delayed if they are still processing
    await BuildJob.updateMany(
      {
        status: 'processing',
        estimatedDate: { $lt: new Date() }
      },
      {
        status: 'delayed'
      }
    );

    const jobs = await BuildJob.find()
      .populate('orderedBy', 'name role')
      .populate('machineId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

exports.createBuildJob = async (req, res, next) => {
  try {
    const jobData = {
      ...req.body,
      orderedBy: req.user._id,
      orderedRole: req.user.role === 'sales' ? 'sales' : 'store_manager',
      status: 'pending'
    };
    const job = await BuildJob.create(jobData);
    
    // Create system notification
    await createInternalNotification(
      'New Build Order Placed',
      `Product: ${job.productName} (Qty: ${job.orderQuantity}) ordered by ${req.user.name}`,
      'order_created',
      req.user.organizationId
    );

    broadcastToOrg(req, 'build_updated', { action: 'create', job });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.updateBuildJob = async (req, res, next) => {
  try {
    const Machine = require('../models/Machine');
    const existingJob = await BuildJob.findById(req.params.id);
    if (!existingJob) return res.status(404).json({ success: false, message: 'Build Job not found' });

    // Handle machine allocation transitions
    if (req.body.status) {
      const newStatus = req.body.status;
      const oldStatus = existingJob.status;
      const newMachineId = req.body.machineId;
      const oldMachineId = existingJob.machineId;

      const isNewRunning = ['processing', 'delayed'].includes(newStatus);

      if (isNewRunning) {
        if (newMachineId) {
          if (oldMachineId && oldMachineId.toString() !== newMachineId.toString()) {
            await Machine.findByIdAndUpdate(oldMachineId, { status: 'working' });
          }
          await Machine.findByIdAndUpdate(newMachineId, { status: 'running' });
        } else if (oldMachineId) {
          await Machine.findByIdAndUpdate(oldMachineId, { status: 'running' });
        }
      } else {
        const machineToRelease = newMachineId || oldMachineId;
        if (machineToRelease) {
          await Machine.findByIdAndUpdate(machineToRelease, { status: 'working' });
        }
        if (newStatus === 'completed') {
          req.body.completedAt = Date.now();
        }
      }
    } else if (req.body.machineId) {
      const currentStatus = existingJob.status;
      const isRunning = ['processing', 'delayed'].includes(currentStatus);
      const oldMachineId = existingJob.machineId;
      const newMachineId = req.body.machineId;

      if (oldMachineId && oldMachineId.toString() !== newMachineId.toString()) {
        await Machine.findByIdAndUpdate(oldMachineId, { status: 'working' });
      }

      if (isRunning) {
        await Machine.findByIdAndUpdate(newMachineId, { status: 'running' });
      } else {
        await Machine.findByIdAndUpdate(newMachineId, { status: 'working' });
      }
    }

    const job = await BuildJob.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('orderedBy', 'name role')
      .populate('machineId');

    if (req.body.status === 'shortage_reported') {
      await createInternalNotification(
        'Material Shortage Flagged',
        `Supervisor flagged shortage for Product: ${job.productName}`,
        'system',
        req.user.organizationId
      );
    }

    if (req.body.status === 'completed') {
      await createInternalNotification(
        'Product Built & Dispatched',
        `Supervisor completed build of Product: ${job.productName} and sent to Godown.`,
        'system',
        req.user.organizationId
      );
      // Emit specialized handshake socket event to Store Manager
      broadcastToOrg(req, 'product_sent_to_store', {
        jobId: job._id,
        productName: job.productName,
        productSize: job.productSize || 'Standard',
        quantity: job.orderQuantity
      });
    }

    broadcastToOrg(req, 'build_updated', { action: 'update', job });
    broadcastToOrg(req, 'machine_updated', { action: 'update' });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

exports.sendToStore = async (req, res, next) => {
  try {
    const job = await BuildJob.findById(req.params.id).populate('orderedBy', 'name role').populate('machineId');
    if (!job) return res.status(404).json({ success: false, message: 'Build Job not found' });

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    if (job.machineId) {
      const Machine = require('../models/Machine');
      await Machine.findByIdAndUpdate(job.machineId, { status: 'working' });
    }

    await createInternalNotification(
      'Product Built & Dispatched',
      `Supervisor completed build of Product: ${job.productName} and sent to Godown.`,
      'system',
      req.user.organizationId
    );

    // Emit specialized handshake socket event to Store Manager
    broadcastToOrg(req, 'product_sent_to_store', {
      jobId: job._id,
      productName: job.productName,
      productSize: job.productSize || 'Standard',
      quantity: job.orderQuantity
    });

    broadcastToOrg(req, 'build_updated', { action: 'update', job });
    broadcastToOrg(req, 'machine_updated', { action: 'update' });

    res.status(200).json({ success: true, message: 'Product dispatched to godown', data: job });
  } catch (error) {
    next(error);
  }
};

exports.receiveBuildProduct = async (req, res, next) => {
  try {
    const { accepted, rackLocation } = req.body;
    const job = await BuildJob.findById(req.params.id).populate('orderedBy', 'name role');
    if (!job) return res.status(404).json({ success: false, message: 'Build Job not found' });

    if (accepted) {
      job.status = 'received';
      await job.save();

      // Automatically add to unified inventory
      let inventoryItem = await InventoryItem.findOne({
        name: job.productName,
        size: job.productSize || 'Standard',
        type: 'finished_good'
      });

      if (inventoryItem) {
        inventoryItem.quantity += job.orderQuantity;
        if (rackLocation) inventoryItem.location = rackLocation;
        await inventoryItem.save();
      } else {
        inventoryItem = await InventoryItem.create({
          name: job.productName,
          type: 'finished_good',
          quantity: job.orderQuantity,
          unit: 'pcs',
          location: rackLocation || 'Unassigned',
          size: job.productSize || 'Standard',
          description: `Automatically created via production build job ${job._id}`
        });
      }

      await createInternalNotification(
        'Product Handshake Completed',
        `Store Manager approved and stocked: ${job.productName} (Qty: ${job.orderQuantity})`,
        'system',
        req.user.organizationId
      );

      broadcastToOrg(req, 'inventory_updated', { action: 'create', item: inventoryItem });
    } else {
      job.status = 'declined';
      await job.save();

      await createInternalNotification(
        'Product Handshake Rejected',
        `Store Manager rejected dispatch of Product: ${job.productName}`,
        'system',
        req.user.organizationId
      );
    }

    broadcastToOrg(req, 'build_updated', { action: 'update', job });

    res.status(200).json({ success: true, message: `Product handshake processed: ${job.status}`, data: job });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// QUALITY CONTROL LOGS & INVOICES
// ==========================================

exports.getQualityLogs = async (req, res, next) => {
  try {
    const logs = await QualityLog.find().populate('verifiedBy', 'name role').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

exports.createQualityLog = async (req, res, next) => {
  try {
    const logData = { ...req.body };
    if (req.file) {
      logData.invoiceUrl = `/uploads/${req.file.filename}`;
    }
    const log = await QualityLog.create(logData);

    await createInternalNotification(
      'QC/Invoice Document Uploaded',
      `Quality Checker uploaded raw document for: ${log.materialName} (${log.qcType})`,
      'user_added', // generic icon
      req.user.organizationId
    );

    broadcastToOrg(req, 'quality_updated', { action: 'create', log });
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.verifyQualityLog = async (req, res, next) => {
  try {
    const log = await QualityLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });

    log.status = 'verified';
    log.verifiedBy = req.user._id;
    await log.save();

    // Deduct damaged products from inventory or add inspected items
    if (log.qcType === 'inspected') {
      let invItem = await InventoryItem.findOne({ name: log.materialName, type: 'raw_material' });
      if (invItem) {
        invItem.quantity += log.quantity;
        await invItem.save();
        broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
      } else {
        invItem = await InventoryItem.create({
          name: log.materialName,
          type: 'raw_material',
          quantity: log.quantity,
          unit: log.unit || 'kg',
          location: 'Unassigned',
          description: `Auto-stocked from verified QC Log ID ${log._id}`
        });
        broadcastToOrg(req, 'inventory_updated', { action: 'create', item: invItem });
      }
    } else if (log.qcType === 'damaged') {
      // If it's a damaged item, we could deduct from inventory
      let invItem = await InventoryItem.findOne({ name: log.materialName });
      if (invItem && invItem.quantity >= log.quantity) {
        invItem.quantity -= log.quantity;
        await invItem.save();
        broadcastToOrg(req, 'inventory_updated', { action: 'update', item: invItem });
      }
    }

    await createInternalNotification(
      'QC Document Verified',
      `Invoice/QC verified by ${req.user.name} for: ${log.materialName}`,
      'system',
      req.user.organizationId
    );

    broadcastToOrg(req, 'quality_updated', { action: 'update', log });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.updateQualityLog = async (req, res, next) => {
  try {
    const logData = { ...req.body };
    if (req.file) {
      logData.invoiceUrl = `/uploads/${req.file.filename}`;
    }
    const log = await QualityLog.findByIdAndUpdate(req.params.id, logData, { new: true, runValidators: true });
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    broadcastToOrg(req, 'quality_updated', { action: 'update', log });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

exports.deleteQualityLog = async (req, res, next) => {
  try {
    const log = await QualityLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Log not found' });
    broadcastToOrg(req, 'quality_updated', { action: 'delete', logId: req.params.id });
    res.status(200).json({ success: true, message: 'Log deleted' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SHORTAGE, BUY, SALES COMMUNICATION LOGS
// ==========================================

exports.getShortageBuySales = async (req, res, next) => {
  try {
    const items = await ShortageBuySale.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

exports.createShortageBuySale = async (req, res, next) => {
  try {
    const item = await ShortageBuySale.create(req.body);

    await createInternalNotification(
      `New ${item.type.toUpperCase()} Logged`,
      `Store Manager created communication record: ${item.itemName} (${item.quantity} ${item.unit})`,
      'system',
      req.user.organizationId
    );

    broadcastToOrg(req, 'communication_updated', { action: 'create', item });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.updateShortageBuySale = async (req, res, next) => {
  try {
    const item = await ShortageBuySale.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Log entry not found' });

    if (req.body.assignedTo && req.body.assignedTo !== 'unassigned') {
      await createInternalNotification(
        'Task Assignment Dispatched',
        `Item: ${item.itemName} has been assigned to ${req.body.assignedTo} in real-time.`,
        'system',
        req.user.organizationId
      );
    }

    broadcastToOrg(req, 'communication_updated', { action: 'update', item });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.deleteShortageBuySale = async (req, res, next) => {
  try {
    const item = await ShortageBuySale.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Log entry not found' });
    broadcastToOrg(req, 'communication_updated', { action: 'delete', itemId: req.params.id });
    res.status(200).json({ success: true, message: 'Log entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};
