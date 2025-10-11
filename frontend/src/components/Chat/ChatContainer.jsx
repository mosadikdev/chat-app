import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import UserProfile from '../Profile/UserProfile';
import { usersAPI } from '../../services/api';

const ChatContainer = () => {
  const { user, logout } = useAuth();
  const { socket, messages, setMessages, onlineUsers } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());

  useEffect(() => {
    setMessages([]);
    setTypingUsers(new Set());
    if (selectedUser) {
      setIsLoading(true);
      fetchUserInfo(selectedUser);
      fetchConversation(selectedUser);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } else {
      setSelectedUserInfo(null);
      setIsLoading(false);
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

      socket.on('userTyping', (data) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.typing) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      });

      socket.on('reconnect', handleReconnect);

      return () => {
        socket.off('reconnect', handleReconnect);
        socket.off('userTyping');
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (content) => {
    if (selectedUser && content.trim() && socket) {
      console.log('📤 Sending message to:', selectedUser, 'content:', content);
      
      socket.emit('typingStop', { to: selectedUser });
      
      socket.emit('sendMessage', {
        to: selectedUser,
        content: content.trim()
      });
    }
  };

  const handleTypingStart = () => {
    if (selectedUser && socket) {
      socket.emit('typingStart', { to: selectedUser });
    }
  };

  const handleTypingStop = () => {
    if (selectedUser && socket) {
      socket.emit('typingStop', { to: selectedUser });
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

  const getTypingText = () => {
    if (typingUsers.size === 0) return null;
    
    const isTyping = Array.from(typingUsers).some(id => id === selectedUser);
    if (isTyping) {
      return (
        <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>{selectedUserInfo?.name || 'User'} is typing...</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50 relative">
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 shadow-blue-600/25"
      >
        {isSidebarOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      <div className={`
        absolute md:relative z-40 h-full w-80 md:w-96 lg:w-80 xl:w-96
        transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        bg-white/95 backdrop-blur-sm border-r border-gray-200/60 flex flex-col
        shadow-xl
      `}>
        <div className="flex-shrink-0 p-6 border-b border-gray-200/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={user?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff&size=128`}
                  alt={user?.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold">{user?.name}</h1>
                <p className="text-blue-100 text-sm opacity-90">Online</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                title="My Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-0"> 
          <UserList 
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
        </div>
      </div>

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        {selectedUser ? (
          <>
            <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="md:hidden flex-shrink-0 text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div 
                      onClick={() => setIsUserProfileOpen(true)}
                      className="flex items-center space-x-4 flex-1 min-w-0 cursor-pointer hover:bg-gray-50/80 rounded-2xl p-3 transition-all duration-200 group"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedUserInfo?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserInfo?.name || 'User')}&background=10b981&color=fff&size=128`}
                          alt={selectedUserInfo?.name || 'User'}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserInfo?.name || 'User')}&background=10b981&color=fff&size=128`;
                          }}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          onlineUsers.has(selectedUser) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-lg truncate">{selectedUserInfo?.name || 'User'}</h3>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-500">
                            {onlineUsers.has(selectedUser) ? '🟢 Online' : '🔴 Offline'}
                          </p>
                          {getTypingText()}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={toggleSidebar}
                    className="md:hidden flex-shrink-0 text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative"> 
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading conversation...</p>
                  </div>
                </div>
              ) : null}
              
              <MessageList 
                messages={messages} 
                currentUser={user?.id} 
              />
            </div>
            
            <div className="flex-shrink-0">
              <MessageInput 
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center shadow-lg">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Welcome to ChatApp</h2>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                Select a conversation from the sidebar to start chatting with your friends and colleagues.
              </p>
              
              <div className="md:hidden bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-blue-800 font-medium">Quick Tip</p>
                </div>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Tap the menu button in the top left to browse and select users to chat with.
                </p>
              </div>

              
            </div>
          </div>
        )}
      </div>

      <UserProfile
        userId={selectedUser}
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />
    </div>
  );
};

export default ChatContainer;