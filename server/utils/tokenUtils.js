const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Generate a secure verification token
const generateVerificationToken = () => {
  // Combine UUID with timestamp and random bytes for extra security
  const uuid = uuidv4();
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  
  // Create a hash of the combined string
  const combined = `${uuid}-${timestamp}-${randomBytes}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
};

// Calculate expiration time (15 minutes from now)
const getExpirationTime = () => {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  return expirationTime;
};

// Check if enough time has passed for resend (2 minutes)
const canResendToken = (lastSentTime) => {
  const now = new Date();
  const timeDifference = now.getTime() - new Date(lastSentTime).getTime();
  const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes
  
  return timeDifference >= twoMinutesInMs;
};

// Check if token is expired
const isTokenExpired = (expirationTime) => {
  const now = new Date();
  return now > new Date(expirationTime);
};

// Clean expired tokens from database
const cleanExpiredTokens = async (db) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      'DELETE FROM email_verifications WHERE expires_at < ? AND used_at IS NULL',
      [now]
    );
    console.log('🧹 Cleaned expired verification tokens');
  } catch (error) {
    console.error('❌ Error cleaning expired tokens:', error);
  }
};

module.exports = {
  generateVerificationToken,
  getExpirationTime,
  canResendToken,
  isTokenExpired,
  cleanExpiredTokens,
};