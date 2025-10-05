const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const userMessages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    }).sort({ createdAt: -1 });

    const conversationsMap = new Map();

    userMessages.forEach(message => {
      const otherUserId = message.sender.toString() === userId ? message.recipient : message.sender;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: 0 
        });
      }
    });

    const conversations = [];
    for (const [otherUserId, conversationData] of conversationsMap) {
      try {
        const userInfo = await User.findById(otherUserId).select('name email');
        if (userInfo) {
          conversations.push({
            _id: otherUserId,
            name: userInfo.name,
            email: userInfo.email,
            lastMessage: conversationData.lastMessage,
            lastMessageTime: conversationData.lastMessageTime,
            unreadCount: conversationData.unreadCount
          });
        }
      } catch (error) {
        console.error('Error fetching user info for:', otherUserId, error);
      }
    }

    conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;

    const existingConversation = await Message.findOne({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    });

    res.json({ hasConversation: !!existingConversation });
  } catch (err) {
    console.error('Error checking conversation:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;