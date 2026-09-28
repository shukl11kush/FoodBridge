import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL, WS_URL } from '../config';
import { Send, X, MessageSquare } from 'lucide-react';

export const ChatDrawer = ({ claimId, isOpen, onClose, senderType = "RESTAURANT" }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isOpen && claimId) {
      fetchMessages();
      connectWebSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [isOpen, claimId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/chats/${claimId}/messages`);
      setMessages(res.data.messages);
    } catch (err) {
      console.error("Error fetching chat history", err);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`${WS_URL}/chats/${claimId}?token=${token}`);
    
    ws.onmessage = (event) => {
      const newMsg = JSON.parse(event.data);
      setMessages((prev) => [...prev, newMsg]);
    };

    socketRef.current = ws;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await axios.post(`${API_URL}/chats/${claimId}/messages`, { message_text: inputText });
      setInputText('');
    } catch (err) {
      console.error("Error sending chat message", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-emerald-200" />
          <h3 className="font-bold text-lg">Claim Communication</h3>
        </div>
        <button onClick={onClose} className="text-emerald-200 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No messages yet. Send a message to arrange pickup details!
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.sender_type === senderType;
            return (
              <div
                key={m.message_id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <p>{m.message_text}</p>
                  <span
                    className={`text-[10px] block mt-1 ${
                      isMe ? 'text-emerald-200 text-right' : 'text-gray-400'
                    }`}
                  >
                    {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-full transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
