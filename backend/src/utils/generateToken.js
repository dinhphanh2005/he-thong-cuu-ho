const jwt = require('jsonwebtoken');

/**
 * Tạo Access Token (ngắn hạn)
 * Mặc định: 7d (overridden bởi JWT_EXPIRE trong .env)
 */
const generateAccessToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sid = sessionId;

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Tạo Refresh Token (dài hạn)
 * Mặc định: 30d (overridden bởi JWT_REFRESH_EXPIRE trong .env)
 */
const generateRefreshToken = (userId, sessionId = null) => {
  const payload = { id: userId };
  if (sessionId) payload.sid = sessionId;

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

// Backward compat alias
const generateToken = generateAccessToken;

module.exports = { generateToken, generateAccessToken, generateRefreshToken };
