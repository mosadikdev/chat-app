import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import { usersAPI } from '../../services/api';

const ChatContainer = () => {
  const { user, logout } = useAuth();
  const { socket, messages, setMessages, onlineUsers } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);

  useEffect(() => {
    setMessages([]);
    if (selectedUser) {
      fetchUserInfo(selectedUser);
      fetchConversation(selectedUser);
    } else {
      setSelectedUserInfo(null);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (socket) {
      const handleReconnect = () => {
        console.log('🔄 Reconnected, re-authenticating...');
        const token = localStorage.getItem('token');
        if (token) {
          socket.emit('authenticate', token);
        }
      };

      socket.on('reconnect', handleReconnect);

      return () => {
        socket.off('reconnect', handleReconnect);
      };
    }
  }, [socket]);

  const fetchUserInfo = async (userId) => {
    try {
      const users = await usersAPI.getUsers();
      const userInfo = users.find(u => u._id === userId);
      setSelectedUserInfo(userInfo);
    } catch (err) {
      console.error('❌ Error fetching user info:', err);
    }
  };

  const fetchConversation = async (otherUserId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/messages/${user.id}/${otherUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      
      const conversation = await response.json();
      setMessages(conversation);
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
    }
  };

  const handleSendMessage = (content) => {
    if (selectedUser && content.trim() && socket) {
      console.log('📤 Sending message to:', selectedUser, 'content:', content);
      socket.emit('sendMessage', {
        to: selectedUser,
        content: content.trim()
      });
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Chat App</h1>
            <button
              onClick={handleLogout}
              className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded transition-colors"
            >
              Logout
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Welcome, {user?.name}</p>
          <div className="flex items-center mt-2 text-blue-200 text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${socket?.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {socket?.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <UserList 
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {selectedUserInfo?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                    onlineUsers.has(selectedUser) ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedUserInfo?.name || 'User'}</h3>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(selectedUser) ? '🟢 Online' : '🔴 Offline'}
                  </p>
                </div>
              </div>
            </div>
            <MessageList messages={messages} currentUser={user?.id} />
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">Select a user to start chatting</p>
              <p className="text-gray-400 text-sm mt-2">Choose someone from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;