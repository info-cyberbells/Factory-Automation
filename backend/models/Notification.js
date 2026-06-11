const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['user_added', 'order_created', 'order_updated', 'system'],
    default: 'system'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const tenantPlugin = require('../utils/tenantPlugin');
NotificationSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Notification', NotificationSchema);
