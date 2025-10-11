import React, { useEffect, useRef, useState } from 'react';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = (behavior = "smooth") => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isAtBottom);
  };

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
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
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
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto p-4 space-y-6 bg-gradient-to-b from-white to-gray-50/30"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">No messages yet</h3>
          <p className="text-gray-500 max-w-sm">
            Start the conversation by sending the first message. Your messages will appear here.
          </p>
        </div>
      ) : (
        Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="space-y-4">
            <div className="flex justify-center my-6">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/60 text-sm text-gray-600 font-medium shadow-sm">
                {formatDate(dateMessages[0].createdAt)}
              </div>
            </div>
            
            {dateMessages.map((message, index) => {
              const isCurrentUser = message.sender === currentUser;
              const showAvatar = index === dateMessages.length - 1 || 
                               dateMessages[index + 1]?.sender !== message.sender;

              return (
                <div
                  key={message._id || message.createdAt}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end space-x-2 group`}
                >
                  {!isCurrentUser && showAvatar && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden border border-gray-300/50">
                    </div>
                  )}
                  
                  {isCurrentUser && <div className="w-8 flex-shrink-0"></div>}
                  
                  <div
                    className={`max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg px-4 py-3 rounded-3xl relative transition-all duration-200 ${
                      isCurrentUser
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-lg shadow-blue-500/25'
                        : 'bg-white text-gray-800 border border-gray-200/60 rounded-bl-md shadow-lg shadow-gray-200/50'
                    } group-hover:shadow-xl group-hover:scale-[1.02]`}
                  >
                    <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        isCurrentUser
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                    
                    {isCurrentUser && message.read && (
                      <div className="absolute -bottom-1 -right-1 text-blue-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
      
      {!shouldAutoScroll && (
        <button
          onClick={() => {
            setShouldAutoScroll(true);
            scrollToBottom();
          }}
          className="fixed bottom-24 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-xl hover:scale-110 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
      
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};

export default MessageList;