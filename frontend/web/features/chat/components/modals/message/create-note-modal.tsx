"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import RichTextTextarea from "../../input/rich-text-textarea";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title, content });
    setTitle("");
    setContent("");
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Create Note
          </h2>
          <button aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`${dialogLayout.body} p-6 space-y-5`}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Note Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full px-4 py-2 border border-input rounded-control focus:ring-2 focus:ring-ring focus:border-info outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Note Content
            </label>
            <RichTextTextarea
              value={content}
              setValue={setContent}
              placeholder="Enter note content..."
              focusColorClassName="focus-within:border-info focus-within:ring-ring"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="w-full bg-warning hover:bg-warning text-warning-foreground font-medium py-2.5 rounded-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CreateNoteModal;

