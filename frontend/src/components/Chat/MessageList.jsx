import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8 p-4">
          <div className="text-4xl mb-2">👋</div>
          <p className="text-lg">No messages yet</p>
          <p className="text-sm text-gray-400 mt-1">Start the conversation by sending a message!</p>
        </div>
      ) : (
        Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs text-gray-500">
                {formatDate(dateMessages[0].createdAt)}
              </div>
            </div>
            
            {dateMessages.map((message) => (
              <div
                key={message._id || message.createdAt}
                className={`flex ${
                  message.sender === currentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg px-3 py-2 rounded-2xl ${
                    message.sender === currentUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  } shadow-sm`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === currentUser
                        ? 'text-blue-200'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};

export default MessageList;