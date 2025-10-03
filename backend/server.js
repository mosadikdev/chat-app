require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users'); 
const Message = require('./models/Message');

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/db-status', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      database: states[dbState] || 'unknown',
      connected: dbState === 1
    });
  } catch (error) {
    res.status(500).json({ error: 'Database check failed' });
  }
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const onlineUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New socket connected:', socket.id);
  
  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(decoded.id);
      
      onlineUsers.set(userId, socket.id);
      userSockets.set(socket.id, {
        userId: userId,
        authenticated: true,
        connectedAt: new Date()
      });
      socket.userId = userId;
      
      console.log('✅ Authenticated user:', userId, 'with socket:', socket.id);
      
      const onlineUsersList = Array.from(onlineUsers.keys());
      io.emit('onlineUsersList', onlineUsersList);
      
      socket.broadcast.emit('userOnline', userId);
      
      socket.emit('authenticationSuccess', { 
        message: 'Authenticated successfully',
        userId: userId
      });
      
    } catch (err) {
      console.log('❌ Socket auth failed:', err.message);
      socket.emit('errorMessage', { message: 'Authentication failed' });
    }
  });

  socket.on('sendMessage', async ({ to, content }) => {
    try {
      if (!socket.userId) {
        return socket.emit('errorMessage', { message: 'Not authenticated' });
      }

      console.log('📤 Sending message from:', socket.userId, 'to:', to, 'content:', content);

      if (!to || !content || content.trim() === '') {
        return socket.emit('errorMessage', { message: 'Invalid message data' });
      }

      const msg = await Message.create({
        sender: socket.userId,
        recipient: to,
        content: content.trim()
      });

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'name email')
        .populate('recipient', 'name email');

      console.log('💾 Message saved to DB:', msg._id);

      socket.emit('messageSent', populatedMsg);

      const toSocketId = onlineUsers.get(String(to));
      if (toSocketId) {
        io.to(toSocketId).emit('newMessage', populatedMsg);
        console.log('📨 Message delivered to online user:', to);
      } else {
        console.log('💤 Recipient is offline, message stored in DB');
      }

    } catch (err) {
      console.error('❌ sendMessage error:', err);
      socket.emit('errorMessage', { 
        message: 'Could not send message',
        error: err.message 
      });
    }
  });

  socket.on('getOnlineUsers', () => {
    if (socket.userId) {
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit('onlineUsersList', onlineUsersList);
      console.log('📋 Sent online users list to:', socket.userId);
    }
  });

  socket.on('typingStart', ({ to }) => {
    if (socket.userId && to) {
      const toSocketId = onlineUsers.get(String(to));
      if (toSocketId) {
        io.to(toSocketId).emit('userTyping', {
          userId: socket.userId,
          typing: true
        });
      }
    }
  });

  socket.on('typingStop', ({ to }) => {
    if (socket.userId && to) {
      const toSocketId = onlineUsers.get(String(to));
      if (toSocketId) {
        io.to(toSocketId).emit('userTyping', {
          userId: socket.userId,
          typing: false
        });
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, 'Reason:', reason);
    
    const userInfo = userSockets.get(socket.id);
    if (userInfo && userInfo.userId) {
      const userId = userInfo.userId;
      
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);
      
      socket.broadcast.emit('userOffline', userId);
      console.log('🔴 User went offline:', userId);
      
      const onlineUsersList = Array.from(onlineUsers.keys());
      io.emit('onlineUsersList', onlineUsersList);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  const pingInterval = setInterval(() => {
    if (socket.userId && socket.connected) {
      const onlineUsersList = Array.from(onlineUsers.keys());
      socket.emit('onlineUsersList', onlineUsersList);
    }
  }, 30000); 

  socket.on('disconnect', () => {
    clearInterval(pingInterval);
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

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully!');
    
    await createTestUsers();
    
    server.listen(PORT, () => {
      console.log('\n🚀 ======= CHAT APP SERVER STARTED =======');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Frontend URL: http://localhost:3000`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`📊 MongoDB: ${process.env.MONGO_URI}`);
      console.log(`🟢 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🛜 CORS Enabled for: http://localhost:3000`);
      console.log('=========================================\n');
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   1. Check if MongoDB service is running');
    console.log('   2. Verify MongoDB connection string in .env file');
    console.log('   3. Ensure port 27017 is available');
    console.log('   4. For Windows: run "net start MongoDB" as administrator');
    console.log('   5. Check firewall settings\n');
    process.exit(1);
  });

process.on('SIGINT', async () => {
  console.log('\n🔻 Shutting down server gracefully...');
  
  io.emit('serverShutdown', { message: 'Server is shutting down' });
  
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  
  server.close(() => {
    console.log('✅ Server shut down successfully');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;