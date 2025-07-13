# WhatsApp Auto-Messaging Feature - Database Schema Update

This update adds support for WhatsApp auto-messaging functionality to the Birthday Buddy application.

## New Database Columns

The following columns have been added to the `birthdays` table:

| Column Name | Data Type | Description | Default |
|-------------|-----------|-------------|---------|
| `phone_number` | VARCHAR(20) | WhatsApp phone number with country code | NULL |
| `custom_message` | TEXT | Personalized birthday message for each person | NULL |
| `auto_message_enabled` | BOOLEAN | Toggle state for enabling/disabling auto messages | FALSE |
| `last_message_sent` | DATE | Track when last message was sent to prevent duplicates | NULL |

## Updated Table Structure

```sql
CREATE TABLE birthdays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  relationship VARCHAR(100),
  bio TEXT,
  phone_number VARCHAR(20),
  custom_message TEXT,
  auto_message_enabled BOOLEAN DEFAULT FALSE,
  last_message_sent DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

## Migration for Existing Installations

For existing installations, use the migration script to add the new columns safely:

```bash
# Apply the migration (add new columns)
npm run migrate:up

# Check current table structure
npm run migrate:check

# Rollback migration (remove columns - use with caution)
npm run migrate:down
```

Or run directly:

```bash
# Apply migration
node migrate.js up

# Check table structure  
node migrate.js check

# Rollback migration
node migrate.js down
```

## API Changes

### Birthday Creation (POST /api/birthdays)

New optional fields:
```json
{
  "name": "John Doe",
  "date": "1990-05-15",
  "relationship": "Friend",
  "bio": "My best friend",
  "phone_number": "+1234567890",
  "custom_message": "Happy Birthday! Hope you have a wonderful day!",
  "auto_message_enabled": true
}
```

### Birthday Update (PUT /api/birthdays/:id)

Same new optional fields as creation.

### Birthday Retrieval (GET /api/birthdays)

Response now includes the new fields:
```json
{
  "success": true,
  "data": {
    "birthdays": [
      {
        "id": 1,
        "name": "John Doe",
        "date": "1990-05-15",
        "relationship": "Friend",
        "bio": "My best friend",
        "phone_number": "+1234567890",
        "custom_message": "Happy Birthday! Hope you have a wonderful day!",
        "auto_message_enabled": 1,
        "last_message_sent": null,
        "created_at": "2025-01-06T12:00:00.000Z"
      }
    ]
  }
}
```

## Validation

- **Phone Number**: Must be 7-20 characters, allows digits, spaces, hyphens, parentheses, and optional + prefix
- **Custom Message**: No specific validation (TEXT field)
- **Auto Message Enabled**: Boolean value (true/false)
- **Last Message Sent**: DATE format (YYYY-MM-DD)

## Backward Compatibility

- All new columns are nullable/optional
- Existing API calls continue to work without modification
- Existing data is preserved during migration
- New fields are included in all responses but can be ignored by older clients

## Error Handling

The migration script includes proper error handling:
- Checks if columns already exist before adding them
- Provides clear success/failure messages
- Safe rollback functionality
- Database connection validation

## Testing

Run the API test suite to verify functionality:

```bash
node test-api.js
```

This tests:
- Birthday creation with WhatsApp fields
- Birthday retrieval including new fields
- Birthday updates with WhatsApp fields
- Upcoming birthdays endpoint
- Field validation