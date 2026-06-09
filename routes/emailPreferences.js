const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const EmailPreference = require('../models/EmailPreference');

// Get user's email preferences
router.get('/', authenticate, async (req, res) => {
  try {
    let preferences = await EmailPreference.findOne({ user: req.user.id });
    
    if (!preferences) {
      preferences = new EmailPreference({ user: req.user.id });
      await preferences.save();
    }
    
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preferences', error: error.message });
  }
});

// Update email preferences
router.put('/', authenticate, async (req, res) => {
  try {
    const { reminderPreferences, unsubscribeAll, quietHours, digestPreferences } = req.body;
    
    let preferences = await EmailPreference.findOne({ user: req.user.id });
    
    if (!preferences) {
      preferences = new EmailPreference({ user: req.user.id });
    }
    
    if (reminderPreferences) preferences.reminderPreferences = reminderPreferences;
    if (unsubscribeAll !== undefined) preferences.unsubscribeAll = unsubscribeAll;
    if (quietHours) preferences.quietHours = quietHours;
    if (digestPreferences) preferences.digestPreferences = digestPreferences;
    
    await preferences.save();
    
    res.json({ message: 'Preferences updated', preferences });
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
});

module.exports = router;