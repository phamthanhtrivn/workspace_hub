import React from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ReadReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  readers: Array<{ userId: string; readAt: string; user?: any }>;
}

export const ReadReceiptDetailModal: React.FC<ReadReceiptDetailModalProps> = ({
  isOpen,
  onClose,
  readers,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            Chi tiết người đọc
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {readers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Chưa có ai đọc tin nhắn này
            </div>
          ) : (
            readers.map((reader, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {reader.user?.avatarUrl ? (
                    <img
                      src={reader.user.avatarUrl}
                      alt={reader.user?.fullName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium bg-gradient-to-br from-gray-100 to-gray-200">
                      {(reader.user?.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {reader.user?.fullName || "Người dùng ẩn danh"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Đã xem lúc {new Date(reader.readAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
