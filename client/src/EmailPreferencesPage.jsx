import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { preferencesAPI } from './services/api';
import './EmailPreferencesPage.css';

export default function EmailPreferencesPage() {
  const { user } = useAuth();
  
  // State for preferences
  const [preferences, setPreferences] = useState({
    birthday_reminders_enabled: true,
    notification_frequency: 'standard',
    user_timezone: 'Asia/Kolkata',
    reminders: {
      reminder_14_days: false,
      reminder_7_days: true,
      reminder_3_days: true,
      reminder_1_day: true
    },
    custom_reminders: {
      custom_1_days: null,
      custom_2_days: null
    },
    reminder_times: {
      time_7_days: '09:00:00',
      time_3_days: '09:00:00',
      time_1_day: '09:00:00'
    }
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timezones, setTimezones] = useState([]);
  const [sendingTest, setSendingTest] = useState(false);

  // Load preferences and timezones on component mount
  useEffect(() => {
    loadPreferences();
    loadTimezones();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await preferencesAPI.getPreferences();
      
      if (data.success) {
        setPreferences(data.data.preferences);
        console.log('✅ Loaded user preferences:', data.data.preferences);
      } else {
        setError('Failed to load preferences');
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadTimezones = async () => {
    try {
      const data = await preferencesAPI.getTimezones();
      
      if (data.success) {
        setTimezones(data.data.timezones);
      }
    } catch (err) {
      console.error('Error loading timezones:', err);
    }
  };

  const handleToggleChange = (category, field) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleMainToggleChange = (field) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSelectChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimeChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      reminder_times: {
        ...prev.reminder_times,
        [field]: value
      }
    }));
  };

  const handleCustomReminderChange = (field, value) => {
    const numValue = value === '' ? null : parseInt(value);
    setPreferences(prev => ({
      ...prev,
      custom_reminders: {
        ...prev.custom_reminders,
        [field]: numValue
      }
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const data = await preferencesAPI.updatePreferences(preferences);
      
      if (data.success) {
        setSuccess('Preferences saved successfully! 🎉');
        console.log('✅ Preferences saved:', data);
      } else {
        setError(data.message || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async (reminderType) => {
    try {
      setSendingTest(true);
      setError('');
      setSuccess('');
      
      const data = await preferencesAPI.sendTestEmail(reminderType);
      
      if (data.success) {
        setSuccess(`Test ${reminderType.replace('_', '-')} email sent! Check your inbox. 📧`);
      } else {
        setError(data.message || 'Failed to send test email');
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      birthday_reminders_enabled: true,
      notification_frequency: 'standard',
      user_timezone: 'Asia/Kolkata',
      reminders: {
        reminder_14_days: false,
        reminder_7_days: true,
        reminder_3_days: true,
        reminder_1_day: true
      },
      custom_reminders: {
        custom_1_days: null,
        custom_2_days: null
      },
      reminder_times: {
        time_7_days: '09:00:00',
        time_3_days: '09:00:00',
        time_1_day: '09:00:00'
      }
    });
    setSuccess('Preferences reset to defaults');
  };

  if (loading) {
    return (
      <div className="preferences-bg">
        <div className="preferences-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading your preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="preferences-bg">
      <div className="preferences-container">
        {/* Header */}
        <div className="preferences-header">
          <h1 className="preferences-title">
            <span role="img" aria-label="Settings">⚙️</span> Email Preferences
          </h1>
          <p className="preferences-subtitle">
            Customize when and how you receive birthday reminder emails
          </p>
          {user && (
            <div className="user-info">
              <span role="img" aria-label="User">👤</span> {user.name} ({user.email})
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="message error-message">
            <span role="img" aria-label="Error">❌</span> {error}
          </div>
        )}
        
        {success && (
          <div className="message success-message">
            <span role="img" aria-label="Success">✅</span> {success}
          </div>
        )}

        {/* Main Settings */}
        <div className="preferences-section">
          <h2 className="section-title">
            <span role="img" aria-label="Email">📧</span> Email Notifications
          </h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Enable Birthday Reminders</label>
              <p className="setting-description">Receive email reminders for upcoming birthdays</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.birthday_reminders_enabled}
                onChange={() => handleMainToggleChange('birthday_reminders_enabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Notification Frequency</label>
              <p className="setting-description">How many reminders you want to receive</p>
            </div>
            <select
              value={preferences.notification_frequency}
              onChange={(e) => handleSelectChange('notification_frequency', e.target.value)}
              className="setting-select"
              disabled={!preferences.birthday_reminders_enabled}
            >
              <option value="minimal">Minimal (1-day only)</option>
              <option value="standard">Standard (1, 3, 7 days)</option>
              <option value="maximum">Maximum (All reminders)</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <label className="setting-label">Your Timezone</label>
              <p className="setting-description">Set your timezone for accurate reminder timing</p>
            </div>
            <select
              value={preferences.user_timezone}
              onChange={(e) => handleSelectChange('user_timezone', e.target.value)}
              className="setting-select"
              disabled={!preferences.birthday_reminders_enabled}
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reminder Types */}
        {preferences.birthday_reminders_enabled && (
          <div className="preferences-section">
            <h2 className="section-title">
              <span role="img" aria-label="Calendar">📅</span> Reminder Types
            </h2>
            
            <div className="reminder-grid">
              <div className="reminder-item">
                <div className="reminder-info">
                  <label className="reminder-label">14 Days Before</label>
                  <p className="reminder-description">Early planning reminder</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.reminders.reminder_14_days}
                    onChange={() => handleToggleChange('reminders', 'reminder_14_days')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="reminder-item">
                <div className="reminder-info">
                  <label className="reminder-label">7 Days Before</label>
                  <p className="reminder-description">Week ahead reminder</p>
                  <input
                    type="time"
                    value={preferences.reminder_times.time_7_days.slice(0, 5)}
                    onChange={(e) => handleTimeChange('time_7_days', e.target.value + ':00')}
                    className="time-input"
                    disabled={!preferences.reminders.reminder_7_days}
                  />
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.reminders.reminder_7_days}
                    onChange={() => handleToggleChange('reminders', 'reminder_7_days')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="reminder-item">
                <div className="reminder-info">
                  <label className="reminder-label">3 Days Before</label>
                  <p className="reminder-description">Last minute preparation</p>
                  <input
                    type="time"
                    value={preferences.reminder_times.time_3_days.slice(0, 5)}
                    onChange={(e) => handleTimeChange('time_3_days', e.target.value + ':00')}
                    className="time-input"
                    disabled={!preferences.reminders.reminder_3_days}
                  />
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.reminders.reminder_3_days}
                    onChange={() => handleToggleChange('reminders', 'reminder_3_days')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="reminder-item">
                <div className="reminder-info">
                  <label className="reminder-label">1 Day Before</label>
                  <p className="reminder-description">Final reminder</p>
                  <input
                    type="time"
                    value={preferences.reminder_times.time_1_day.slice(0, 5)}
                    onChange={(e) => handleTimeChange('time_1_day', e.target.value + ':00')}
                    className="time-input"
                    disabled={!preferences.reminders.reminder_1_day}
                  />
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.reminders.reminder_1_day}
                    onChange={() => handleToggleChange('reminders', 'reminder_1_day')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Custom Reminders */}
        {preferences.birthday_reminders_enabled && (
          <div className="preferences-section">
            <h2 className="section-title">
              <span role="img" aria-label="Custom">🔧</span> Custom Reminders
            </h2>
            
            <div className="custom-reminder-grid">
              <div className="custom-reminder-item">
                <label className="custom-reminder-label">Custom Reminder 1</label>
                <div className="custom-reminder-input">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Days"
                    value={preferences.custom_reminders.custom_1_days || ''}
                    onChange={(e) => handleCustomReminderChange('custom_1_days', e.target.value)}
                    className="custom-days-input"
                  />
                  <span className="custom-reminder-text">days before</span>
                </div>
              </div>

              <div className="custom-reminder-item">
                <label className="custom-reminder-label">Custom Reminder 2</label>
                <div className="custom-reminder-input">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Days"
                    value={preferences.custom_reminders.custom_2_days || ''}
                    onChange={(e) => handleCustomReminderChange('custom_2_days', e.target.value)}
                    className="custom-days-input"
                  />
                  <span className="custom-reminder-text">days before</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Section */}
        {preferences.birthday_reminders_enabled && (
          <div className="preferences-section">
            <h2 className="section-title">
              <span role="img" aria-label="Test">🧪</span> Test Email Reminders
            </h2>
            
            <div className="test-email-grid">
              <button
                onClick={() => sendTestEmail('7_days')}
                disabled={sendingTest || !preferences.reminders.reminder_7_days}
                className="test-email-btn"
              >
                <span role="img" aria-label="Email">📧</span> Test 7-Day Reminder
              </button>
              
              <button
                onClick={() => sendTestEmail('3_days')}
                disabled={sendingTest || !preferences.reminders.reminder_3_days}
                className="test-email-btn"
              >
                <span role="img" aria-label="Email">📧</span> Test 3-Day Reminder
              </button>
              
              <button
                onClick={() => sendTestEmail('1_day')}
                disabled={sendingTest || !preferences.reminders.reminder_1_day}
                className="test-email-btn"
              >
                <span role="img" aria-label="Email">📧</span> Test 1-Day Reminder
              </button>
            </div>
            
            <p className="test-description">
              Send yourself a test reminder email to see how it looks
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="preferences-actions">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="save-btn"
          >
            {saving ? (
              <>
                <div className="button-spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <span role="img" aria-label="Save">💾</span> Save Preferences
              </>
            )}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="reset-btn"
          >
            <span role="img" aria-label="Reset">🔄</span> Reset to Defaults
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="cancel-btn"
          >
            <span role="img" aria-label="Back">← </span> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}