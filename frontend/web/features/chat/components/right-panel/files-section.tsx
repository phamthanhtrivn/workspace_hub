import React from "react";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";

interface FilesSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  filesAndDocs: any[];
}

export default function FilesSection({
  isExpanded,
  onToggle,
  filesAndDocs,
}: FilesSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <FileText size={18} className="text-gray-500" />
          Tài liệu & Files
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {filesAndDocs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              Chưa có tài liệu nào
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filesAndDocs.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.sizeBytes
                        ? (item.sizeBytes / 1024).toFixed(2)
                        : "0"}{" "}
                      KB
                    </p>
                  </div>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
