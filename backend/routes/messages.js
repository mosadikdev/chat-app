const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

router.get('/:userId', auth, async (req, res) => {
  const myId = req.user.id;
  const otherId = req.params.userId;
  try {
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: otherId },
        { sender: otherId, recipient: myId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
