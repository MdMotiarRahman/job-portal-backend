const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;

    // Check if user is banned
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isBanned) {
      return res
        .status(403)
        .json({ message: 'Your account has been banned', banReason: user.bannedReason });
    }

    if (!user.isActive && user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Your account is currently inactive' });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    await user.save();

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return next();
  };
};

const checkPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const hasPermission = requiredPermissions.every((perm) =>
        user.permissions.includes(perm)
      );

      if (!hasPermission) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = authenticate;
module.exports.requireRole = requireRole;
module.exports.checkPermission = checkPermission;
