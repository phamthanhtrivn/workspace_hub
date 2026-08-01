import React, { useState, useRef } from "react";
import { Grid, List, ChevronDown, FolderPlus, UploadCloud } from "lucide-react";
import { DocumentViewType } from "../types/documents.enums";
import { ViewLayout, DocumentSortBy } from "../types/documents.types";

interface ExplorerToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewLayout: ViewLayout;
  setViewLayout: (layout: ViewLayout) => void;
  activeView: DocumentViewType;
  onCreateFolder: () => void;
  onUploadFile?: (file: File) => void;
  sortBy: DocumentSortBy;
  setSortBy: (sortBy: DocumentSortBy) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function ExplorerToolbar({
  searchQuery,
  setSearchQuery,
  viewLayout,
  setViewLayout,
  activeView,
  onCreateFolder,
  onUploadFile,
  sortBy,
  setSortBy,
  inputRef,
}: ExplorerToolbarProps) {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6 bg-white/50 backdrop-blur-md z-10">
      <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-md">
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm kiếm tài liệu, thư mục (Ctrl+K)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:bg-white focus:outline-hidden transition-all placeholder:text-slate-400 font-semibold text-slate-700"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Sort Select */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as DocumentSortBy)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 focus:outline-hidden cursor-pointer hover:border-slate-300 transition-colors"
        >
          <option value={DocumentSortBy.LATEST}>Mới nhất</option>
          <option value={DocumentSortBy.OLDEST}>Cũ nhất</option>
        </select>

        {/* View Layout Switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50">
          <button
            onClick={() => setViewLayout(ViewLayout.GRID)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${
              viewLayout === ViewLayout.GRID
                ? "bg-white text-[var(--color-primary)] shadow-xs"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewLayout(ViewLayout.LIST)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${
              viewLayout === ViewLayout.LIST
                ? "bg-white text-[var(--color-primary)] shadow-xs"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            <List size={16} />
          </button>
        </div>

        {/* [+ Mới] Dropdown menu */}
        {activeView === DocumentViewType.MY_FILES && (
          <div className="relative">
            <button
              onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
              className="flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer"
            >
              <span>+ Mới</span>
              <ChevronDown size={14} />
            </button>

            {isNewMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsNewMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-slate-100 shadow-xl py-2 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      onCreateFolder();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <FolderPlus className="text-amber-500" size={16} />
                    <span>Thư mục mới</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsNewMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-50 cursor-pointer"
                  >
                    <UploadCloud className="text-blue-500" size={16} />
                    <span>Tải lên tệp</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUploadFile?.(e.target.files[0]);
            e.target.value = "";
          }
        }}
        className="hidden"
      />
    </div>
  );
}

export default React.memo(ExplorerToolbar);
