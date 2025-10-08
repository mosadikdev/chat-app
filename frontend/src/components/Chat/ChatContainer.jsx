import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import Profile from '../Profile/Profile';
import { usersAPI } from '../../services/api';
import UserProfile from '../Profile/UserProfile';

const ChatContainer = () => {
  const { user, logout } = useAuth();
  const { socket, messages, setMessages, onlineUsers } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  useEffect(() => {
    setMessages([]);
    if (selectedUser) {
      fetchUserInfo(selectedUser);
      fetchConversation(selectedUser);
      // على الهواتف، إغلاق الـ sidebar عند اختيار مستخدم
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } else {
      setSelectedUserInfo(null);
    }
  }, [selectedUser, setMessages]);

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = () => {
        console.log('New message received, conversations might need refresh');
      };

      socket.on('newMessage', handleNewMessage);
      socket.on('messageSent', handleNewMessage);

      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageSent', handleNewMessage);
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg"
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      <div className={`
        absolute md:relative z-40 h-full w-80 md:w-1/4 lg:w-1/5 xl:w-1/6
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        bg-white border-r border-gray-200 flex flex-col
      `}>
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Chat App</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded transition-colors"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-blue-100 text-sm mt-1 truncate">Welcome, {user?.name}</p>
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

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-white shadow-sm">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden flex-shrink-0 text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div 
                  onClick={() => setIsUserProfileOpen(true)}
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={selectedUserInfo?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserInfo?.name || 'User')}&background=10b981&color=fff&size=128`}
                      alt={selectedUserInfo?.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserInfo?.name || 'User')}&background=10b981&color=fff&size=128`;
                      }}
                    />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(selectedUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{selectedUserInfo?.name || 'User'}</h3>
                    <p className="text-xs text-gray-500">
                      {onlineUsers.has(selectedUser) ? '🟢 Online' : '🔴 Offline'}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={toggleSidebar}
                  className="md:hidden flex-shrink-0 text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            <MessageList messages={messages} currentUser={user?.id} />
            
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-sm">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg mb-2">Select a user to start chatting</p>
              <p className="text-gray-400 text-sm mb-4">Choose someone from the sidebar</p>
              
              <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> Tap the menu button in the top left to see users
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Profile 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <UserProfile
        userId={selectedUser}
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />
    </div>
  );
};

export default ChatContainer;