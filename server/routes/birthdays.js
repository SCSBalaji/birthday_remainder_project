const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All birthday routes are protected
router.use(authenticateToken);

// GET /api/birthdays - Get all birthdays for logged-in user
router.get('/', async (req, res) => {
  try {
    const [birthdays] = await req.db.execute(
      'SELECT id, name, date, relationship, bio, created_at FROM birthdays WHERE user_id = ? ORDER BY date ASC',
      [req.user.userId]
    );

    res.json({
      success: true,
      message: 'Birthdays retrieved successfully',
      data: {
        birthdays,
        count: birthdays.length
      }
    });

  } catch (error) {
    console.error('Get birthdays error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST /api/birthdays - Create new birthday
router.post('/', async (req, res) => {
  try {
    const { name, date, relationship, bio } = req.body;

    // Validation
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required',
        error: 'Missing required fields'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format',
        error: 'Invalid date format'
      });
    }

    // Insert new birthday
    const [result] = await req.db.execute(
      'INSERT INTO birthdays (user_id, name, date, relationship, bio) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, name, date, relationship || null, bio || null]
    );

    // Get the created birthday
    const [newBirthday] = await req.db.execute(
      'SELECT id, name, date, relationship, bio, created_at FROM birthdays WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Birthday created successfully',
      data: {
        birthday: newBirthday[0]
      }
    });

  } catch (error) {
    console.error('Create birthday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT /api/birthdays/:id - Update existing birthday
router.put('/:id', async (req, res) => {
  try {
    const birthdayId = req.params.id;
    const { name, date, relationship, bio } = req.body;

    // Check if birthday exists and belongs to user
    const [existingBirthdays] = await req.db.execute(
      'SELECT id FROM birthdays WHERE id = ? AND user_id = ?',
      [birthdayId, req.user.userId]
    );

    if (existingBirthdays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Birthday not found or access denied',
        error: 'Birthday does not exist'
      });
    }

    // Validation
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required',
        error: 'Missing required fields'
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format',
        error: 'Invalid date format'
      });
    }

    // Update birthday
    await req.db.execute(
      'UPDATE birthdays SET name = ?, date = ?, relationship = ?, bio = ? WHERE id = ? AND user_id = ?',
      [name, date, relationship || null, bio || null, birthdayId, req.user.userId]
    );

    // Get updated birthday
    const [updatedBirthday] = await req.db.execute(
      'SELECT id, name, date, relationship, bio, created_at FROM birthdays WHERE id = ?',
      [birthdayId]
    );

    res.json({
      success: true,
      message: 'Birthday updated successfully',
      data: {
        birthday: updatedBirthday[0]
      }
    });

  } catch (error) {
    console.error('Update birthday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE /api/birthdays/:id - Delete birthday
router.delete('/:id', async (req, res) => {
  try {
    const birthdayId = req.params.id;

    // Check if birthday exists and belongs to user
    const [existingBirthdays] = await req.db.execute(
      'SELECT id, name FROM birthdays WHERE id = ? AND user_id = ?',
      [birthdayId, req.user.userId]
    );

    if (existingBirthdays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Birthday not found or access denied',
        error: 'Birthday does not exist'
      });
    }

    // Delete birthday
    await req.db.execute(
      'DELETE FROM birthdays WHERE id = ? AND user_id = ?',
      [birthdayId, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Birthday deleted successfully',
      data: {
        deletedBirthday: existingBirthdays[0]
      }
    });

  } catch (error) {
    console.error('Delete birthday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/birthdays/upcoming - Get upcoming birthdays (next 30 days)
router.get('/upcoming', async (req, res) => {
  try {
    // Calculate upcoming birthdays in the next 30 days
    const [birthdays] = await req.db.execute(`
      SELECT id, name, date, relationship, bio,
             CASE 
               WHEN DATE_FORMAT(date, '%m-%d') >= DATE_FORMAT(CURDATE(), '%m-%d')
               THEN DATEDIFF(
                 DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(date, '%m-%d'))), 
                 CURDATE()
               )
               ELSE DATEDIFF(
                 DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(date, '%m-%d'))), 
                 CURDATE()
               )
             END as days_until
      FROM birthdays 
      WHERE user_id = ?
      HAVING days_until <= 30
      ORDER BY days_until ASC, date ASC
    `, [req.user.userId]);

    res.json({
      success: true,
      message: 'Upcoming birthdays retrieved successfully',
      data: {
        birthdays,
        count: birthdays.length
      }
    });

  } catch (error) {
    console.error('Get upcoming birthdays error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;