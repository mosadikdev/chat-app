import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

const ChatContainer = () => {
  const { user } = useAuth();
  const { socket, onlineUsers, messages, setMessages } = useSocket();
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
      const conversation = await response.json();
      setMessages(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const handleSendMessage = (content) => {
    if (selectedUser && content.trim()) {
      socket.emit('sendMessage', {
        to: selectedUser,
        content: content.trim()
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/4 bg-white border-r">
        <UserList 
          onlineUsers={onlineUsers}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold">Chat with User {selectedUser}</h3>
            </div>
            <MessageList messages={messages} currentUser={user.id} />
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;