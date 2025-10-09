const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  bio: {
    type: String,
    default: '',
    maxlength: 200
  },
  profilePicture: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

UserSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastActive = new Date();
  }
  next();
});

UserSchema.virtual('initials').get(function() {
  return this.name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
});

UserSchema.virtual('defaultAvatar').get(function() {
  const colors = [
    'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7',
    'DDA0DD', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E9'
  ];
  const color = colors[Math.abs(this.name.length) % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=${color}&color=fff&size=128`;
});

UserSchema.statics.updateUserStatus = async function(userId, status) {
  try {
    const updateData = { status };
    if (status === 'offline') {
      updateData.lastSeen = new Date();
    }
    return await this.findByIdAndUpdate(userId, updateData, { new: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', UserSchema);