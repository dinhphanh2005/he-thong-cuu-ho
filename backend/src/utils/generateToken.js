const jwt = require('jsonwebtoken');

/**
 * Tạo Access Token (ngắn hạn)
 */
const generateAccessToken = (id, sessionId = null) => {
  const payload = { id };
  if (sessionId) payload.sid = sessionId;
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Tạo Refresh Token (dài hạn)
 */
const generateRefreshToken = (id, sessionId = null) => {
  const payload = { id };
  if (sessionId) payload.sid = sessionId;

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

// Backward compat alias
const generateToken = generateAccessToken;

module.exports = { generateToken, generateAccessToken, generateRefreshToken };
