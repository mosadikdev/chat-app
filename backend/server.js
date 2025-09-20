require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

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
  console.log('socket connected', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      onlineUsers.set(String(decoded.id), socket.id);
      socket.userId = String(decoded.id);
      console.log('authenticated', socket.userId);
    } catch (err) {
      console.log('socket auth failed', err.message);
    }
  });

  socket.on('sendMessage', async ({ to, content }) => {
    try {
      const Message = require('./models/Message');
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
      console.error(err);
      socket.emit('errorMessage', { message: 'Could not send message' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) onlineUsers.delete(socket.userId);
    console.log('socket disconnected', socket.id);
  });
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => server.listen(PORT, () => console.log('Server running on', PORT)))
  .catch(err => console.error('MongoDB error', err));
