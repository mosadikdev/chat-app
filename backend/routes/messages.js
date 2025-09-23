const express = require('express');
const router = express.Router();
const Message = require('../models/Message'); 

router.post('/', async (req, res) => {
  try {
    const { sender, recipient, content } = req.body;

    const message = await Message.create({
      sender,
      recipient,
      content
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:userId/:otherId', async (req, res) => {
  try {
    const { userId, otherId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherId },
        { sender: otherId, recipient: userId }
      ]
    }).sort({ createdAt: 1 }); 
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
