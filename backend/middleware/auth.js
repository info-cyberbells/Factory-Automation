const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tenantContext = require('./tenantContext');

const Organization = require('../models/Organization');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized - no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated by admin' });
    }

    if (req.user.organizationId) {
      const org = await Organization.findById(req.user.organizationId);
      if (org && org.requiresReverification) {
        // Exclude the reverify endpoints so the admin can unlock it
        if (!req.originalUrl.includes('/organizations/reverify-otp') && !req.originalUrl.includes('/organizations/resend-reverify-otp')) {
          return res.status(403).json({ success: false, requiresReverification: true, message: 'Organization requires OTP reverification' });
        }
      }
    }

    // Wrap the rest of the request in the tenant context
    let tenantId = req.user.organizationId;

    if (req.user.role === 'super_admin') {
      const headerOrgId = req.headers['x-organization-id'];
      if (headerOrgId && headerOrgId !== 'null' && headerOrgId !== 'undefined' && headerOrgId !== '') {
        tenantId = headerOrgId;
      }
    }

    if (tenantId) {
      tenantContext.run(tenantId, () => {
        next();
      });
    } else {
      tenantContext.run(null, () => {
        next();
      });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
  }
};

module.exports = { protect };
