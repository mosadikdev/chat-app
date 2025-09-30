import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserList = ({ selectedUser, onSelectUser }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockUsers = [
      { id: 'user2', name: 'John Doe', email: 'john@example.com' },
      { id: 'user3', name: 'Jane Smith', email: 'jane@example.com' },
      { id: 'user4', name: 'Mike Johnson', email: 'mike@example.com' },
    ];
    
    setUsers(mockUsers);
    setLoading(false);
  }, []);

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
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Online Users
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {users.map((userItem) => (
          <button
            key={userItem.id}
            onClick={() => onSelectUser(userItem.id)}
            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
              selectedUser === userItem.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {userItem.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userItem.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {userItem.email}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserList;