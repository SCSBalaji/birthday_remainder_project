// Save verification token to database
const saveVerificationToken = async (db, userId, token, expirationTime) => {
  try {
    // First, mark any existing tokens for this user as used
    await db.execute(
      'UPDATE email_verifications SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [userId]
    );
    
    // Insert new verification token
    const [result] = await db.execute(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expirationTime]
    );
    
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('❌ Error saving verification token:', error);
    return { success: false, error: error.message };
  }
};

// Get verification token from database
const getVerificationToken = async (db, token) => {
  try {
    const [rows] = await db.execute(
      `SELECT ev.*, u.email, u.name, u.email_verified 
       FROM email_verifications ev 
       JOIN users u ON ev.user_id = u.id 
       WHERE ev.token = ? AND ev.used_at IS NULL`,
      [token]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('❌ Error getting verification token:', error);
    return null;
  }
};

// Mark token as used and verify user email (FIXED - no transactions)
const markTokenAsUsed = async (db, token, userId) => {
  try {
    // Mark token as used
    await db.execute(
      'UPDATE email_verifications SET used_at = NOW() WHERE token = ?',
      [token]
    );
    
    // Update user email verification status
    await db.execute(
      'UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = ?',
      [userId]
    );
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking token as used:', error);
    return { success: false, error: error.message };
  }
};

// Get last verification token time for user
const getLastVerificationTime = async (db, userId) => {
  try {
    const [rows] = await db.execute(
      'SELECT created_at FROM email_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    return rows.length > 0 ? rows[0].created_at : null;
  } catch (error) {
    console.error('❌ Error getting last verification time:', error);
    return null;
  }
};

module.exports = {
  saveVerificationToken,
  getVerificationToken,
  markTokenAsUsed,
  getLastVerificationTime,
};