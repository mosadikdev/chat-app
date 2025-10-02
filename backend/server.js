require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const Message = require('./models/Message');
const User = require('./models/User');

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Chat App Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      name: mongoose.connection.name || 'Not connected'
    }
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

async function createTestUsers() {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    const testUsers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10)
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com', 
        password: await bcrypt.hash('password123', 10)
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        password: await bcrypt.hash('password123', 10)
      }
    ];
    
    let createdCount = 0;
    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created test user: ${userData.email}`);
        createdCount++;
      }
    }
    
    if (createdCount > 0) {
      console.log(`🎉 Created ${createdCount} test users!`);
    } else {
      console.log('📝 Test users already exist');
    }
    console.log('🔑 You can login with: john@example.com / password123');
    
  } catch (error) {
    console.log('⚠️ Note: Could not create test users', error.message);
  }
}

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(decoded.id);
      
      const user = await User.findById(userId).select('name email');
      if (!user) {
        throw new Error('User not found');
      }
      
      onlineUsers.set(userId, {
        socketId: socket.id,
        userInfo: user
      });
      
      socket.userId = userId;
      socket.userInfo = user;
      
      console.log(`✅ User authenticated: ${user.name} (${userId})`);
      
      socket.broadcast.emit('userOnline', {
        userId: userId,
        userInfo: user
      });
      
      const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, data]) => ({
        id: id,
        userInfo: data.userInfo
      }));
      
      socket.emit('onlineUsers', onlineUsersList);
      
    } catch (err) {
      console.log('❌ Socket auth failed:', err.message);
      socket.emit('authentication_error', { message: 'Authentication failed' });
    }
  });

  socket.on('sendMessage', async ({ to, content }) => {
    try {
      if (!socket.userId) {
        return socket.emit('errorMessage', { message: 'Not authenticated' });
      }

      if (!content || !content.trim()) {
        return socket.emit('errorMessage', { message: 'Message content is required' });
      }

      console.log(`📨 Message from ${socket.userId} to ${to}: ${content}`);

      const msg = await Message.create({
        sender: socket.userId,
        recipient: to,
        content: content.trim()
      });

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'name email')
        .populate('recipient', 'name email');

      const toSocket = onlineUsers.get(String(to));
      if (toSocket) {
        io.to(toSocket.socketId).emit('newMessage', populatedMsg);
        console.log(`✅ Message delivered to ${to}`);
      } else {
        console.log(`📱 User ${to} is offline - message stored in database`);
      }

      socket.emit('messageSent', populatedMsg);

    } catch (err) {
      console.error('❌ sendMessage error:', err);
      socket.emit('errorMessage', { message: 'Could not send message: ' + err.message });
    }
  });

  socket.on('typingStart', ({ to }) => {
    if (socket.userId) {
      const toSocket = onlineUsers.get(String(to));
      if (toSocket) {
        io.to(toSocket.socketId).emit('userTyping', {
          userId: socket.userId,
          userInfo: socket.userInfo
        });
      }
    }
  });

  socket.on('typingStop', ({ to }) => {
    if (socket.userId) {
      const toSocket = onlineUsers.get(String(to));
      if (toSocket) {
        io.to(toSocket.socketId).emit('userStoppedTyping', {
          userId: socket.userId
        });
      }
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('userOffline', socket.userId);
      console.log(`🔴 User disconnected: ${socket.userId}`);
    }
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing in .env file');
  console.error('💡 Please create a .env file with MONGO_URI and JWT_SECRET');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing in .env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully!');
    
    await createTestUsers();
    
    server.listen(PORT, () => {
      console.log('🚀 Server running on port', PORT);
      console.log('🌐 Frontend: http://localhost:3000');
      console.log('🔗 Health check: http://localhost:5000/api/health');
      console.log('📊 MongoDB: mongodb://localhost:27017/chat-app');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Please check:');
    console.log('   1. Is MongoDB service running?');
    console.log('   2. Is the connection string correct?');
    console.log('   3. Is port 27017 available?');
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});