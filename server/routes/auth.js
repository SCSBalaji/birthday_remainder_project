const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// Email verification imports
const { generateVerificationToken, getExpirationTime, isTokenExpired, canResendToken } = require('../utils/tokenUtils');
const { saveVerificationToken, getVerificationToken, markTokenAsUsed, getLastVerificationTime } = require('../utils/dbHelpers');
const { sendVerificationEmail } = require('../services/emailService');

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
        error: 'Missing required fields'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'Password too short'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
        error: 'Invalid email format'
      });
    }

    // Check if user already exists
    const [existingUsers] = await req.db.execute(
      'SELECT id, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      if (existingUser.email_verified) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists and is verified',
          error: 'Email already registered and verified'
        });
      } else {
        return res.status(409).json({
          success: false,
          message: 'An account with this email exists but is not verified. Please check your email for verification link.',
          error: 'Email already registered but not verified'
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user (email_verified defaults to FALSE)
    const [result] = await req.db.execute(
      'INSERT INTO users (name, email, password, email_verified) VALUES (?, ?, ?, FALSE)',
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const expirationTime = getExpirationTime();

    // Save verification token to database
    const tokenResult = await saveVerificationToken(req.db, userId, verificationToken, expirationTime);
    
    if (!tokenResult.success) {
      // If token saving fails, remove the user
      await req.db.execute('DELETE FROM users WHERE id = ?', [userId]);
      return res.status(500).json({
        success: false,
        message: 'Failed to create verification token',
        error: tokenResult.error
      });
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(email, name, verificationToken);
    
    if (!emailResult.success) {
      // If email sending fails, remove the user and token
      await req.db.execute('DELETE FROM users WHERE id = ?', [userId]);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: 'Email service error'
      });
    }

    // Success response (no token returned, user must verify email first)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email and click the verification link to activate your account.',
      data: {
        user: {
          id: userId,
          name,
          email,
          email_verified: false
        },
        verification: {
          email_sent: true,
          expires_in_minutes: 15
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'Missing credentials'
      });
    }

    // Find user
    const [users] = await req.db.execute(
      'SELECT id, name, email, password, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'User not found'
      });
    }

    const user = users[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        error: 'Email not verified',
        requires_verification: true
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'Password mismatch'
      });
    }

    // Generate token (only for verified users)
    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          email_verified: user.email_verified
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
});

// GET /api/auth/profile (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'User does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: users[0]
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        error: 'Missing token'
      });
    }

    // Get token from database
    const verificationData = await getVerificationToken(req.db, token);
    
    if (!verificationData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
        error: 'Token not found or already used'
      });
    }

    // Check if user is already verified
    if (verificationData.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
        error: 'Already verified'
      });
    }

    // Check if token is expired
    if (isTokenExpired(verificationData.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired. Please request a new one.',
        error: 'Token expired'
      });
    }

    // Mark token as used and verify user
    const result = await markTokenAsUsed(req.db, token, verificationData.user_id);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify email',
        error: result.error
      });
    }

    // Generate JWT token for immediate login after verification
    const jwtToken = generateToken(verificationData.user_id, verificationData.email);

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Birthday Buddy!',
      data: {
        user: {
          id: verificationData.user_id,
          name: verificationData.name,
          email: verificationData.email,
          email_verified: true
        },
        token: jwtToken,
        verified_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification',
      error: error.message
    });
  }
});

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
        error: 'Missing email'
      });
    }

    // Find user
    const [users] = await req.db.execute(
      'SELECT id, name, email, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
        error: 'User not found'
      });
    }

    const user = users[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
        error: 'Already verified'
      });
    }

    // Check if enough time has passed since last verification email (2 minutes)
    const lastVerificationTime = await getLastVerificationTime(req.db, user.id);
    
    if (lastVerificationTime && !canResendToken(lastVerificationTime)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 2 minutes before requesting a new verification email',
        error: 'Too frequent requests'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expirationTime = getExpirationTime();

    // Save new verification token
    const tokenResult = await saveVerificationToken(req.db, user.id, verificationToken, expirationTime);
    
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate verification token',
        error: tokenResult.error
      });
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationToken);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
        error: 'Email service error'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully! Please check your inbox.',
      data: {
        email_sent: true,
        expires_in_minutes: 15,
        sent_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resending verification email',
      error: error.message
    });
  }
});

// GET /api/auth/verification-status/:email - Check verification status
router.get('/verification-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
        error: 'Missing email'
      });
    }

    // Find user
    const [users] = await req.db.execute(
      'SELECT id, name, email, email_verified, email_verified_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
        error: 'User not found'
      });
    }

    const user = users[0];

    // Get last verification attempt
    const lastVerificationTime = await getLastVerificationTime(req.db, user.id);
    const canResend = !lastVerificationTime || canResendToken(lastVerificationTime);

    res.json({
      success: true,
      message: 'Verification status retrieved',
      data: {
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
        email_verified_at: user.email_verified_at,
        can_resend_verification: !user.email_verified && canResend,
        last_verification_sent: lastVerificationTime
      }
    });

  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while checking verification status',
      error: error.message
    });
  }
});

module.exports = router;