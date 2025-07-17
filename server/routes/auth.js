const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

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

    console.log(`🔍 [${new Date().toISOString()}] Login attempt for email:`, email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'Missing credentials'
      });
    }

    // Find user with verification status
    const [users] = await req.db.execute(
      'SELECT id, name, email, password, email_verified_at FROM users WHERE email = ?',
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
    console.log(`🔍 User found: ${user.email}, Verified: ${user.email_verified_at ? 'Yes' : 'No'}`);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'Password mismatch'
      });
    }

    // Check if email is verified
    if (!user.email_verified_at) {
      console.log('❌ Login blocked: Email not verified');
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        error: 'Email not verified',
        requires_verification: true
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

// POST /api/auth/verify-email - Email verification endpoint
router.post('/verify-email', async (req, res) => {
  const startTime = Date.now();
  try {
    const { token } = req.body;
    
    console.log(`🔍 [${new Date().toISOString()}] Verification request for token: ${token?.substring(0, 20)}...`);

    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        error: 'No token provided'
      });
    }

    // Check if token exists and hasn't expired
    const [tokenRows] = await req.db.execute(
      `SELECT ev.*, u.id as user_id, u.name, u.email, u.email_verified_at 
       FROM email_verifications ev 
       JOIN users u ON ev.user_id = u.id 
       WHERE ev.token = ? AND ev.expires_at > NOW() AND ev.used_at IS NULL`,
      [token]
    );

    console.log(`🔍 Token lookup result: ${tokenRows.length > 0 ? 'Found valid token' : 'Token not found/expired/used'}`);

    if (tokenRows.length === 0) {
      // Check if token exists but is expired/used
      const [expiredTokens] = await req.db.execute(
        'SELECT ev.*, u.email FROM email_verifications ev JOIN users u ON ev.user_id = u.id WHERE ev.token = ?',
        [token]
      );
      
      if (expiredTokens.length > 0) {
        const expiredToken = expiredTokens[0];
        if (expiredToken.used_at) {
          console.log('❌ Token already used');
          return res.status(400).json({
            success: false,
            message: 'This verification link has already been used',
            error: 'Token already used'
          });
        } else {
          console.log('❌ Token expired');
          return res.status(400).json({
            success: false,
            message: 'This verification link has expired. Please request a new one.',
            error: 'Token expired'
          });
        }
      }
      
      console.log('❌ Invalid token');
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token',
        error: 'Token not found'
      });
    }

    const verification = tokenRows[0];
    console.log(`🔍 User current verification status: ${verification.email_verified_at ? 'Already verified' : 'Not verified'}`);

    // Check if user is already verified
    if (verification.email_verified_at) {
      console.log('✅ User already verified, marking token as used');
      
      // Mark token as used
      await req.db.execute(
        'UPDATE email_verifications SET used_at = NOW() WHERE id = ?',
        [verification.id]
      );
      
      // Generate JWT token for auto-login
      const jwt = require('jsonwebtoken');
      const authToken = jwt.sign(
        { userId: verification.user_id, email: verification.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Email already verified! Welcome back.',
        data: {
          user: {
            id: verification.user_id,
            name: verification.name,
            email: verification.email
          },
          token: authToken
        }
      });
    }

    console.log(`🔍 Verifying user: ${verification.email}`);
    
    // Mark user as verified
    const [updateResult] = await req.db.execute(
      'UPDATE users SET email_verified_at = NOW() WHERE id = ?',
      [verification.user_id]
    );
    
    console.log(`🔍 User update result: ${updateResult.affectedRows} rows affected`);

    // Mark token as used
    const [tokenUpdateResult] = await req.db.execute(
      'UPDATE email_verifications SET used_at = NOW() WHERE id = ?',
      [verification.id]
    );
    
    console.log(`🔍 Token update result: ${tokenUpdateResult.affectedRows} rows affected`);

    // Generate JWT token for auto-login
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign(
      { userId: verification.user_id, email: verification.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = {
      success: true,
      message: 'Email verified successfully! Welcome to Birthday Buddy!',
      data: {
        user: {
          id: verification.user_id,
          name: verification.name,
          email: verification.email
        },
        token: authToken
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Verification successful in ${processingTime}ms`);

    res.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [${new Date().toISOString()}] Verification failed in ${processingTime}ms:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification',
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`🔐 [${new Date().toISOString()}] Password reset request for:`, email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
        error: 'Missing email'
      });
    }

    // Check if user exists and is verified
    const [users] = await req.db.execute(
      'SELECT id, name, email, email_verified_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // For security, don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link shortly.'
      });
    }

    const user = users[0];

    // Check if user is verified
    if (!user.email_verified_at) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first before resetting password.',
        error: 'Email not verified'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await req.db.execute(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    
    const emailSubject = '🔐 Reset Your Birthday Buddy Password';
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #b621fe 0%, #1fd1f9 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; background: linear-gradient(135deg, #b621fe 0%, #1fd1f9 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>We received a request to reset your password for your Birthday Buddy account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset My Password</a>
            </p>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link expires in <strong>15 minutes</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">${resetLink}</p>
          </div>
          <div class="footer">
            <p>Birthday Buddy - Never forget a birthday again! 🎂</p>
            <p>This email was sent to ${user.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using your existing email service
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Changed from EMAIL_APP_PASSWORD to EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection before sending
    try {
      await transporter.verify();
      console.log('📧 Email transporter verified successfully');
    } catch (emailConfigError) {
      console.error('❌ Email transporter verification failed:', emailConfigError);
      return res.status(500).json({
        success: false,
        message: 'Email service is temporarily unavailable',
        error: 'Email configuration error'
      });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Birthday Buddy" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: emailSubject,
      html: emailHTML
    });

    console.log(`✅ Password reset email sent to: ${user.email}`);

    res.json({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link shortly.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log(`🔐 [${new Date().toISOString()}] Password reset attempt with token:`, token?.substring(0, 20) + '...');

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required',
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

    // Find valid reset token
    const [tokenRows] = await req.db.execute(
      'SELECT pr.*, u.id as user_id, u.name, u.email FROM password_resets pr JOIN users u ON pr.user_id = u.id WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used_at IS NULL',
      [token]
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'Token not found or expired'
      });
    }

    const resetRequest = tokenRows[0];

    // Hash new password
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await req.db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, resetRequest.user_id]
    );

    // Mark reset token as used
    await req.db.execute(
      'UPDATE password_resets SET used_at = NOW() WHERE id = ?',
      [resetRequest.id]
    );

    // Generate login token for auto-login
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign(
      { userId: resetRequest.user_id, email: resetRequest.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Password reset successful for user: ${resetRequest.email}`);

    res.json({
      success: true,
      message: 'Password reset successful! You are now logged in.',
      data: {
        user: {
          id: resetRequest.user_id,
          name: resetRequest.name,
          email: resetRequest.email
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;