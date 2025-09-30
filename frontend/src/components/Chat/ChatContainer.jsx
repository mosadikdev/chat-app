import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

const ChatContainer = () => {
  const { user, logout } = useAuth();
  const { socket, messages, setMessages } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (selectedUser) {
      fetchConversation(selectedUser);
    }
  }, [selectedUser]);

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
      console.error('Error fetching conversation:', error);
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

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Chat App</h1>
            <button
              onClick={handleLogout}
              className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">Welcome, {user?.name}</p>
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
              <h3 className="font-semibold text-gray-800">Chat with User {selectedUser}</h3>
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