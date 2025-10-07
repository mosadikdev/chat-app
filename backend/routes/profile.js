const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userObj = user.toObject();
    if (userObj.profilePicture && !userObj.profilePicture.startsWith('http')) {
      userObj.profilePicture = `${req.protocol}://${req.get('host')}/${userObj.profilePicture}`;
    }
    
    res.json(userObj);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userObj = user.toObject();
    if (userObj.profilePicture && !userObj.profilePicture.startsWith('http')) {
      userObj.profilePicture = `${req.protocol}://${req.get('host')}/${userObj.profilePicture}`;
    }
    
    res.json(userObj);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
    }
    
    if (bio && bio.length > 200) {
      return res.status(400).json({ message: 'Bio cannot exceed 200 characters' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;

    if (req.file) {
      const user = await User.findById(req.user.id);
      if (user.profilePicture && !user.profilePicture.startsWith('http')) {
        const oldImagePath = path.join(__dirname, '..', user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      updateData.profilePicture = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    const userObj = updatedUser.toObject();
    if (userObj.profilePicture && !userObj.profilePicture.startsWith('http')) {
      userObj.profilePicture = `${req.protocol}://${req.get('host')}/${userObj.profilePicture}`;
    }

    res.json(userObj);
  } catch (err) {
    console.error('Error updating profile:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/picture', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.profilePicture && !user.profilePicture.startsWith('http')) {
      const imagePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    user.profilePicture = '';
    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json(userObj);
  } catch (err) {
    console.error('Error deleting profile picture:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;