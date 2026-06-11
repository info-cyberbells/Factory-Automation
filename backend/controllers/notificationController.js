const Notification = require('../models/Notification');

// @desc    Get all notifications (Admin only)
// @route   GET /api/notifications
// @access  Private (super_admin, admin)
exports.getNotifications = async (req, res, next) => {
  try {
    // Only return recent 50 notifications
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    
    // Check if the current user has read them
    const formatted = notifications.map(n => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      createdAt: n.createdAt,
      isRead: n.readBy.includes(req.user.id)
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.readBy.includes(req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { readBy: { $ne: req.user.id } },
      { $push: { readBy: req.user.id } }
    );
    res.status(200).json({ success: true, message: 'All marked as read' });
  } catch (error) {
    next(error);
  }
};

// Helper function to create notification internally
exports.createNotification = async (title, message, type = 'system') => {
  try {
    await Notification.create({ title, message, type });
  } catch (err) {
    console.error('Failed to create notification', err);
  }
};
