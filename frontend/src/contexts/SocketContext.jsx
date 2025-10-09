import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]); 
  const { user } = useAuth();

  const updateConversations = async () => {
    try {
      const { conversationsAPI } = await import('../services/api');
      const conversationsData = await conversationsAPI.getConversations();
      setConversations(conversationsData);
    } catch (err) {
      console.error('❌ Error updating conversations:', err);
    }
  };

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to server with socket:', newSocket.id);
        
        const token = localStorage.getItem('token');
        if (token) {
          newSocket.emit('authenticate', token);
        }

        updateConversations();
      });

      newSocket.on('userStatusUpdate', (data) => {
  console.log('🔄 User status update:', data);
});

newSocket.on('userActivity', (data) => {
  console.log('📱 User activity:', data);
});

      newSocket.on('onlineUsersList', (usersList) => {
        console.log('📋 Online users list:', usersList);
        const usersMap = new Map();
        usersList.forEach(userId => {
          usersMap.set(userId, true);
        });
        setOnlineUsers(usersMap);
      });

      newSocket.on('userOnline', (userId) => {
        console.log('🟢 User came online:', userId);
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, true);
          return newMap;
        });
      });

      newSocket.on('userOffline', (userId) => {
        console.log('🔴 User went offline:', userId);
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      newSocket.on('newMessage', (message) => {
        console.log('📨 New message received:', message);
        setMessages(prev => {
          const messageExists = prev.some(msg => 
            msg._id === message._id || 
            (msg.sender === message.sender && 
             msg.recipient === message.recipient && 
             msg.content === message.content &&
             Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
          );
          
          if (messageExists) {
            console.log('⚠️ Duplicate message detected, skipping...');
            return prev;
          }
          
          return [...prev, message];
        });

        updateConversations();
      });

      newSocket.on('messageSent', (message) => {
        console.log('✅ Message sent confirmation:', message);
        setMessages(prev => {
          const messageExists = prev.some(msg => 
            msg._id === message._id || 
            (msg.sender === message.sender && 
             msg.recipient === message.recipient && 
             msg.content === message.content &&
             Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
          );
          
          if (messageExists) {
            return prev;
          }
          
          return [...prev, message];
        });

        updateConversations();
      });

      newSocket.on('errorMessage', (error) => {
        console.error('❌ Socket error:', error);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
      });

      setSocket(newSocket);

      return () => {
        console.log('🔄 Cleaning up socket connection...');
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setOnlineUsers(new Map());
        setMessages([]);
        setConversations([]);
      }
    }
  }, [user]);

  const value = {
    socket,
    onlineUsers,
    messages,
    setMessages,
    conversations, 
    updateConversations 
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};