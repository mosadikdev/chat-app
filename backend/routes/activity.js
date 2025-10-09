const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/update', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { lastActive: new Date() },
      { new: true }
    ).select('-password');

    res.json({ 
      success: true, 
      lastActive: user.lastActive 
    });
  } catch (err) {
    console.error('Error updating activity:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;