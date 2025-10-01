import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { usersAPI } from '../../services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

const ChatContainer = () => {
  const { user, logout } = useAuth();
  const { socket, messages, setMessages, onlineUsers } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  // جلب معلومات المستخدم المحدد والمحادثة
  useEffect(() => {
    if (selectedUser) {
      fetchUserInfo(selectedUser);
      fetchConversation(selectedUser);
    } else {
      setSelectedUserInfo(null);
      setMessages([]);
    }
  }, [selectedUser]);

  // الاستماع للرسائل الجديدة من Socket
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        // إضافة الرسالة فقط إذا كانت مرتبطة بالمحادثة الحالية
        if (message.sender === selectedUser || message.recipient === selectedUser) {
          setMessages(prev => [...prev, message]);
        }
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messageSent', handleNewMessage);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageSent', handleNewMessage);
      };
    }
  }, [socket, selectedUser, setMessages]);

  const fetchUserInfo = async (userId) => {
    try {
      const users = await usersAPI.getUsers();
      const userInfo = users.find(u => u._id === userId);
      setSelectedUserInfo(userInfo);
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  };

  const fetchConversation = async (otherUserId) => {
    try {
      setLoading(true);
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
      console.error('Error fetching conversation:', error);
      // عرض رسالة خطأ للمستخدم
      alert('Failed to load conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (content) => {
    if (selectedUser && content.trim() && socket) {
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

  const handleUserSelect = (userId) => {
    setSelectedUser(userId);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
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
          <div className="mt-2 flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-blue-100">{user?.email}</p>
            </div>
          </div>
        </div>
        
        {/* User List */}
        <UserList 
          selectedUser={selectedUser}
          onSelectUser={handleUserSelect}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {selectedUserInfo?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    {/* Online Status Indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(selectedUser) ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {selectedUserInfo?.name || 'Loading...'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {onlineUsers.has(selectedUser) ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        <span className="text-gray-400">Offline</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} currentUser={user?.id} />
            )}

            {/* Message Input */}
            <MessageInput 
              onSendMessage={handleSendMessage} 
              disabled={!onlineUsers.has(selectedUser)}
            />
          </>
        ) : (
          /* Welcome Screen when no user is selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="text-6xl mb-6">💬</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Welcome to Chat App
              </h2>
              <p className="text-gray-600 mb-2">
                Select a user from the sidebar to start chatting
              </p>
              <p className="text-gray-500 text-sm">
                You can see online users with the green indicator
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Quick Tips:</h3>
                <ul className="text-sm text-blue-700 text-left space-y-1">
                  <li>• Click on any user to start a conversation</li>
                  <li>• Green dot indicates online users</li>
                  <li>• Messages are delivered in real-time</li>
                  <li>• Your chat history is saved automatically</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;