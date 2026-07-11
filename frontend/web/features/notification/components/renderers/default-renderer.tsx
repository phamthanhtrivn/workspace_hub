"use client";

import React from "react";
import { Notification } from "../../types/notification.types";
import { Bell } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";

export const DefaultListItemRenderer: React.FC<{
  notification: Notification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer transition border-b border-slate-100 last:border-0 ${!notification.isRead ? "bg-blue-50/50" : ""}`}
    >
      <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-500">
        {notification.senderAvatar ? (
          <Image
            src={notification.senderAvatar}
            alt="Avatar"
            fill
            className="object-cover"
          />
        ) : (
          <Bell size={20} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
          {notification.title}
        </p>
        <p className="text-[10px] font-medium text-slate-400 mt-1">
          {formatTimeAgo(new Date(notification.createdAt))}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
      )}
    </div>
  );
};

export const DefaultModalRenderer: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative h-12 w-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-500">
          {notification.senderAvatar ? (
            <Image
              src={notification.senderAvatar}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <Bell size={24} />
          )}
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{notification.title}</h3>
          <p className="text-xs text-slate-500">
            {formatTimeAgo(new Date(notification.createdAt))}
          </p>
        </div>
      </div>
      <div className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
        {notification.content}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
