const jwt = require("jsonwebtoken");
const User = require("../models/User");


// ============================
// VERIFY TOKEN
// ============================

exports.verifyToken = async (req, res, next) => {

  try {

    const token =
      req.headers["x-access-token"] ||
      req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    // REMOVE Bearer
    const actualToken = token.replace(
      "Bearer ",
      ""
    );

    // VERIFY
    const decoded = jwt.verify(
      actualToken,
      process.env.JWT_SECRET
    );

    // SAVE USER DATA
    req.userId = decoded.id;
    req.role = decoded.role;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Token is invalid or expired",
    });

  }

};


// ============================
// ADMIN
// ============================

exports.isAdmin = async (req, res, next) => {

  try {

    if (req.role !== "admin") {
      return res.status(403).json({
        message: "Admin access only",
      });
    }

    next();

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};


// ============================
// EMPLOYER
// ============================

exports.isEmployer = async (req, res, next) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role !== "employer") {
      return res.status(403).json({
        message: "Employer access only",
      });
    }

    next();

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};


// ============================
// SEEKER
// ============================

exports.isSeeker = async (req, res, next) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role !== "seeker") {
      return res.status(403).json({
        message: "Seeker access only",
      });
    }

    next();

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};