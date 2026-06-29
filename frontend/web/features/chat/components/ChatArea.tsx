"use client";

import React from 'react';
import ChatInput from './ChatInput';
import { MoreVertical, Phone, Video, Info, ArrowLeft } from 'lucide-react';

interface ChatAreaProps {
  onToggleRightPanel: () => void;
  onBack?: () => void;
}

export default function ChatArea({ onToggleRightPanel, onBack }: ChatAreaProps) {
  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-3">
          {onBack && (
            <button 
              className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="relative">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              T
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Team Project</h2>
            <p className="text-xs text-gray-500">4 members • 2 online</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-500">
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Phone size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Video size={20} />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button 
            className="p-2 hover:bg-gray-100 hover:text-blue-600 rounded-full transition"
            onClick={onToggleRightPanel}
          >
            <Info size={20} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-6">
        
        {/* Date Separator */}
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
            Today
          </span>
        </div>

        {/* Message from other */}
        <div className="flex items-end gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
            A
          </div>
          <div className="max-w-[70%]">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-medium text-gray-800">Alice</span>
              <span className="text-xs text-gray-500">10:41 AM</span>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-sm shadow-sm">
              <p className="text-gray-800 text-sm">Hi team, here is the latest design file for the chat module.</p>
              
              {/* Attachment Preview (File) */}
              <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                  <span className="text-xs font-bold">PDF</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-800 truncate">chat_ui_v2.pdf</p>
                  <p className="text-xs text-gray-500">2.4 MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message from me */}
        <div className="flex items-end justify-end gap-2">
          <div className="max-w-[70%] flex flex-col items-end">
            <div className="flex items-baseline gap-2 mb-1 justify-end">
              <span className="text-xs text-gray-500">10:42 AM</span>
              <span className="text-sm font-medium text-gray-800">You</span>
            </div>
            <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm shadow-sm">
              <p className="text-sm">Can we review the new design in the afternoon meeting?</p>
            </div>
            
            {/* Poll Attachment */}
            <div className="mt-2 w-full bg-white border border-gray-200 p-3 rounded-xl shadow-sm self-end">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                📊 What time works best?
              </h4>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition flex justify-between">
                  <span>2:00 PM</span>
                  <span className="text-gray-400">0</span>
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition flex justify-between">
                  <span>3:30 PM</span>
                  <span className="text-gray-400">0</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Input Area */}
      <ChatInput />
    </div>
  );
}
