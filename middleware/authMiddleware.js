const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expect: Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded: { user: { id, role } }
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

module.exports = authenticate;
