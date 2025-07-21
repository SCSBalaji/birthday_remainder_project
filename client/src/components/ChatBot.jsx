import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatbotAPI } from '../services/api';
import './ChatBot.css';

const ChatBot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hi ${user?.name || 'there'}! 👋 I'm your Birthday Buddy AI assistant. I can help you with questions about the app, managing birthdays, or explaining features. What would you like to know?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognition = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('💬 [CHATBOT] Sending message:', message);
      
      // Use specialized chatbot API with longer timeout
      const response = await chatbotAPI.chat(message);
      
      console.log('✅ [CHATBOT] Response received:', response.data);

      if (response.data.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sender: 'bot',
          timestamp: new Date(),
          model: response.data.model
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('❌ [CHATBOT] Error:', error);
      
      // Better error handling for timeouts
      let errorMsg = "I'm sorry, I'm having trouble right now. Please try again in a moment.";
      
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        errorMsg = "I'm taking a bit longer to think... Please try asking again. The first question sometimes takes 30-60 seconds while I warm up! 🤖";
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: errorMsg,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (recognition.current && !isListening) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const quickQuestions = [
    "What features does Birthday Buddy have?",
    "How do I add a birthday?",
    "How do email reminders work?",
    "What are the different relationship types?"
  ];

  return (
    <div className="chatbot-container">
      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        title="Birthday Buddy AI Assistant"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="bot-avatar">🤖</div>
              <div>
                <div className="bot-name">Birthday Buddy AI</div>
                <div className="bot-status">Online • llama3.2:3b</div>
              </div>
            </div>
            <button className="close-btn" onClick={toggleChat}>✕</button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <div className={`message-bubble ${message.isError ? 'error' : ''}`}>
                    {message.text}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="message-bubble loading">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="quick-questions">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-question-btn"
                onClick={() => sendMessage(question)}
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Birthday Buddy..."
                disabled={isLoading}
                rows="1"
                className="chat-input"
              />
              
              {recognition.current && (
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={startListening}
                  disabled={isLoading || isListening}
                  title="Voice input"
                >
                  🎤
                </button>
              )}
              
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                title="Send message"
              >
                📤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;