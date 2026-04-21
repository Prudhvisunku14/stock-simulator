// middleware/adminMiddleware.js
// Middleware to ensure the authenticated user is an ADMIN

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
};

module.exports = adminMiddleware;
