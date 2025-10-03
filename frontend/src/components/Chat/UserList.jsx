import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { usersAPI } from '../../services/api';

const UserList = ({ selectedUser, onSelectUser }) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchUsers();
    
    if (socket) {
      socket.emit('getOnlineUsers');
    }
  }, [socket]);

  const fetchUsers = async () => {
    try {
      const usersData = await usersAPI.getUsers();
      setUsers(usersData);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      const results = await usersAPI.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error('❌ Error searching users:', err);
      setSearchResults([]);
    }
  };

  const displayUsers = searchQuery.trim() ? searchResults : users;

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((n) => (
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
      <div className="p-4 border-b border-gray-200 bg-white">
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
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Online Users: {onlineUsers.size}</span>
          <button 
            onClick={() => socket?.emit('getOnlineUsers')}
            className="text-blue-500 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {searchQuery.trim() ? 'Search Results' : `All Users (${users.length})`}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {displayUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchQuery.trim() ? 'No users found' : 'No users available'}
            </div>
          ) : (
            displayUsers.map((userItem) => (
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        onlineUsers.has(userItem._id) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {onlineUsers.has(userItem._id) ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {userItem.email}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;