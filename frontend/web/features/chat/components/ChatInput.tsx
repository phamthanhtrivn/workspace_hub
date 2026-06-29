"use client";

import React, { useState } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  CheckSquare, 
  BarChart2, 
  Calendar, 
  FileText, 
  Smile, 
  Plus
} from 'lucide-react';

export default function ChatInput() {
  const [message, setMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        
        {/* Attachment Options Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className={`p-2 rounded-full transition-colors ${showOptions ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <Plus size={20} className={`transition-transform ${showOptions ? 'rotate-45' : ''}`} />
          </button>
          
          {showOptions && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 z-10">
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <ImageIcon size={16} className="text-blue-500" /> Image
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <Paperclip size={16} className="text-gray-500" /> File
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <CheckSquare size={16} className="text-green-500" /> Task
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <BarChart2 size={16} className="text-purple-500" /> Poll
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <Calendar size={16} className="text-orange-500" /> Event
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <FileText size={16} className="text-yellow-500" /> Note
              </button>
            </div>
          )}
        </div>

        {/* Message Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none px-2 py-2 text-gray-800 placeholder-gray-400"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              // Handle send
              setMessage('');
            }
          }}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 pb-1">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition">
            <Smile size={20} />
          </button>
          <button 
            className={`p-2 rounded-full transition-colors flex items-center justify-center ${message.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
            disabled={!message.trim()}
          >
            <Send size={18} className="mr-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
