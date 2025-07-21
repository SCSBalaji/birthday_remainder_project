/**
 * Production Configuration for Birthday Buddy
 * Optimized for scale, performance, and reliability
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    host: '0.0.0.0',
    timeout: 30000,
    keepAliveTimeout: 5000,
    headersTimeout: 60000
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 100,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
  },

  // Email Configuration
  email: {
    service: 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 20,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  },

  // Cron Job Configuration
  cron: {
    // Daily reminder processing at 12:00 AM IST (6:30 PM UTC)
    dailyReminders: '30 18 * * *',
    // Weekly analytics at Sunday 2:00 AM IST (8:30 PM UTC Saturday)
    weeklyAnalytics: '30 20 * * 6',
    // Monthly cleanup at 1st day 3:00 AM IST (9:30 PM UTC previous day)
    monthlyCleanup: '30 21 1 * *',
    timezone: 'UTC'
  },

  // Smart Scheduling Configuration
  smartScheduling: {
    relationshipPriority: {
      'partner': 4,
      'family': 3,
      'friend': 2,
      'colleague': 1,
      'other': 1
    },
    defaultReminderTypes: ['7_days', '3_days', '1_day'],
    maxRemindersPerUser: 50,
    bulkProcessingBatchSize: 100,
    learningThreshold: 10 // minimum interactions for ML
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: '24h',
    bcryptRounds: 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // limit each IP to 100 requests per windowMs
    corsOrigins: [
      process.env.FRONTEND_URL,
      'https://your-production-domain.com'
    ]
  },

  // Performance Configuration
  performance: {
    enableGzip: true,
    enableEtag: true,
    cacheControl: 'public, max-age=3600',
    requestTimeout: 30000,
    bodyParserLimit: '10mb'
  },

  // Monitoring Configuration
  monitoring: {
    enableHealthChecks: true,
    enableMetrics: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    errorReporting: {
      enabled: true,
      service: 'sentry' // Add Sentry DSN in env vars
    }
  },

  // Feature Flags
  features: {
    advancedEmailTemplates: true,
    smartScheduling: true,
    behavioralAnalytics: true,
    bulkProcessing: true,
    realTimeRecommendations: true,
    emailVerification: true,
    passwordReset: true
  }
};