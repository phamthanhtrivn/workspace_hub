import React from "react";
import { FileText, ChevronDown, ChevronRight, Download } from "lucide-react";
import { saveAs } from "file-saver";

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
  const handleDownload = async (
    e: React.MouseEvent,
    url: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <FileText size={18} className="text-gray-500" />
          Files
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
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition border-2 border-gray-200"
                >
                  <div className="w-10 h-10 bg-blue-500 text-white rounded flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.sizeBytes
                        ? (item.sizeBytes / 1024).toFixed(2)
                        : "0"}{" "}
                      KB
                    </p>
                  </div>
                  {item.fileUrl && (
                    <button
                      onClick={(e) =>
                        handleDownload(e, item.fileUrl, item.name)
                      }
                      className="cursor-pointer p-1.5 text-gray-400 hover:text-blue-700 hover:bg-blue-100 rounded transition"
                    >
                      <Download size={18} />
                    </button>
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
