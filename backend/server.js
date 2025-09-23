require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');       
const messageRoutes = require('./routes/messages'); 
const Message = require('./models/Message');      

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      onlineUsers.set(String(decoded.id), socket.id);
      socket.userId = String(decoded.id);
      console.log('Authenticated user:', socket.userId);
    } catch (err) {
      console.log('Socket auth failed:', err.message);
    }
  });

  socket.on('sendMessage', async ({ to, content }) => {
    try {
      if (!socket.userId) return socket.emit('errorMessage', { message: 'Not authenticated' });

      const msg = await Message.create({
        sender: socket.userId,
        recipient: to,
        content
      });

      const toSocket = onlineUsers.get(String(to));
      if (toSocket) {
        io.to(toSocket).emit('newMessage', msg);
      }

      socket.emit('messageSent', msg);

    } catch (err) {
      console.error('sendMessage error:', err);
      socket.emit('errorMessage', { message: 'Could not send message' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
    console.log('Socket disconnected:', socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => console.log('Server running on port', PORT));
  })
  .catch(err => console.error('MongoDB connection error:', err));
