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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        
        const token = localStorage.getItem('token');
        if (token) {
          newSocket.emit('authenticate', token);
        }
      });

      newSocket.on('newMessage', (message) => {
        console.log('New message received:', message);
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('messageSent', (message) => {
        console.log('Message sent confirmation:', message);
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('errorMessage', (error) => {
        console.error('Socket error:', error);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const value = {
    socket,
    onlineUsers,
    messages,
    setMessages
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};