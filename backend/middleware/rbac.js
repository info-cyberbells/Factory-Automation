// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const isMasterAdmin = ['super_admin', 'admin'].includes(req.user.role);
    
    // 1. Master admins always get access
    if (isMasterAdmin) return next();

    // 2. Exact role match
    if (roles.includes(req.user.role)) return next();

    // 3. Permission match
    if (req.user.permissions && Array.isArray(req.user.permissions)) {
      // First check if any of the allowed roles match their permissions directly (e.g. 'orders' in roles array)
      const hasDirectPermission = roles.some(role => req.user.permissions.includes(role));
      if (hasDirectPermission) return next();

      // Second check: derive required permission from the API route
      const routeMap = {
        '/api/gate-entry': 'gate_entry',
        '/api/production': 'production',
        '/api/store': 'store',
        '/api/orders': 'orders',
        '/api/finance': 'finance',
        '/api/hr': 'hr'
      };
      const requiredPerm = routeMap[req.baseUrl];
      if (requiredPerm && req.user.permissions.includes(requiredPerm)) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: `You do not have permission to access this resource`
    });
  };
};

module.exports = { authorize };
