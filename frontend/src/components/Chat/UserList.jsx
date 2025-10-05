import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { usersAPI, formatRelativeTime } from '../../services/api';

const UserList = ({ selectedUser, onSelectUser }) => {
  const { user } = useAuth();
  const { socket, onlineUsers, conversations, updateConversations } = useSocket();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  useEffect(() => {
    fetchAllUsers();
    
    if (socket) {
      socket.emit('getOnlineUsers');
    }
  }, [socket]);

  const fetchAllUsers = async () => {
    try {
      const usersData = await usersAPI.getUsers();
      setAllUsers(usersData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
  };

  const handleRefresh = () => {
    updateConversations();
    fetchAllUsers();
    socket?.emit('getOnlineUsers');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(userItem =>
    userItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userItem.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usersWithoutConversations = allUsers.filter(userItem =>
    !conversations.some(conv => conv._id === userItem._id)
  ).filter(userItem =>
    userItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    userItem.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center space-x-3">
              <div className="rounded-full bg-gray-300 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <div className="absolute right-3 top-2.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <div className="mt-3 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 text-xs font-medium text-center ${
              activeTab === 'chats'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Chats ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 text-xs font-medium text-center ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users ({allUsers.length})
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Online: {onlineUsers.size}</span>
          <button 
            onClick={handleRefresh}
            className="text-blue-500 hover:text-blue-700 text-xs flex items-center"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <div className="divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
                <p className="text-xs text-gray-400 mt-1">
                  Start a conversation from the "All Users" tab
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => onSelectUser(conversation._id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors duration-200 ${
                    selectedUser === conversation._id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 relative">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {conversation.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        onlineUsers.has(conversation._id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.name}
                        </p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatRelativeTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-blue-600 font-medium">
                            {conversation.unreadCount} new message{conversation.unreadCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.filter(userItem => 
              conversations.some(conv => conv._id === userItem._id)
            ).length > 0 && (
              <div className="p-2 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 px-2">With conversations</p>
              </div>
            )}
            
            {filteredUsers.filter(userItem => 
              conversations.some(conv => conv._id === userItem._id)
            ).map((userItem) => (
              <button
                key={userItem._id}
                onClick={() => onSelectUser(userItem._id)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors duration-200 ${
                  selectedUser === userItem._id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {userItem.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(userItem._id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userItem.name}
                      </p>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Has chat
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {userItem.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {usersWithoutConversations.length > 0 && (
              <div className="p-2 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 px-2">New users</p>
              </div>
            )}
            
            {usersWithoutConversations.map((userItem) => (
              <button
                key={userItem._id}
                onClick={() => onSelectUser(userItem._id)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors duration-200 ${
                  selectedUser === userItem._id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {userItem.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(userItem._id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {userItem.name}
                      </p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {userItem.email}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Start a conversation
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No users found' : 'No users available'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;