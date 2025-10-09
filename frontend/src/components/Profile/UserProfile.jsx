import React, { useState, useEffect } from 'react';
import { profileAPI } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';

const UserProfile = ({ userId, onClose, isOpen }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { onlineUsers } = useSocket();

  useEffect(() => {
    if (userId && isOpen) {
      fetchUserProfile();
    } else {
      setUser(null);
      setError('');
      setLoading(true);
    }
  }, [userId, isOpen]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      setUser(null);
      
      console.log('🎯 Opening profile for user ID:', userId);
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID provided');
      }

      const userData = await profileAPI.getUserProfile(userId);
      setUser(userData);
    } catch (err) {
      console.error('❌ Error in fetchUserProfile:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAvatar = (name) => {
    if (!name) name = 'User';
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7'];
    const color = colors[Math.abs(name.length) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=128`;
  };

  const formatLastSeen = (lastSeen, isOnline = false) => {
  if (isOnline) {
    return 'Online now';
  }
  
  if (!lastSeen) return 'Never been online';
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInSeconds < 30) {
    return 'Just now';
  } else if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  } else {
    return lastSeenDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
              <p className="text-sm text-gray-500 mt-2">User ID: {userId}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium text-lg mb-2">{error}</p>
              <p className="text-gray-500 text-sm mb-4">
                User ID: {userId}
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={fetchUserProfile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : user ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={user.profilePicture || getDefaultAvatar(user.name)}
                    alt={user.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    onError={(e) => {
                      console.log('🖼️ Image load error, using default avatar');
                      e.target.src = getDefaultAvatar(user.name);
                    }}
                  />
                  <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${
                    onlineUsers.has(userId) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                </div>
              </div>

              <div className="text-center">
  <h3 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h3>
  <div className="flex flex-col items-center space-y-2 text-sm text-gray-600">
    <span className={`flex items-center ${onlineUsers.has(userId) ? 'text-green-600' : 'text-gray-500'}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${onlineUsers.has(userId) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
      {onlineUsers.has(userId) ? 'Online' : 'Offline'}
    </span>
    
    {!onlineUsers.has(userId) && user.lastSeen && (
      <span className="text-gray-500 text-sm">
        Last seen: {formatLastSeen(user.lastSeen)}
      </span>
    )}
    
  </div>
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  About
                </label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {user.bio ? (
                    <p className="text-gray-700 text-center leading-relaxed">{user.bio}</p>
                  ) : (
                    <p className="text-gray-500 text-center italic">No bio yet</p>
                  )}
                </div>
              </div>

             

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-blue-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email || 'Email not available'}
                  </div>
                  <div className="flex items-center text-sm text-blue-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 text-4xl mb-2">😕</div>
              <p className="text-gray-600 font-medium">User data not available</p>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;