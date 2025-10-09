const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },      
  recipient: { type: String, required: true },   
  content: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });                         

module.exports = mongoose.model('Message', MessageSchema);