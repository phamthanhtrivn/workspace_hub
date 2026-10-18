"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";

import { X, FileText } from "lucide-react";
import RichTextTextarea from "../../input/rich-text-textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";


interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialContent: string;
  onSave: (title: string, content: string) => void;
}

export default function EditNoteModal({
  isOpen,
  onClose,
  initialTitle,
  initialContent,
  onSave,
}: EditNoteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
    }
  }, [isOpen, initialTitle, initialContent]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(title.trim(), content.trim());
    onClose();
  };

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground flex items-center gap-2">
            <FileText size={20} className="text-warning-content" />
            Edit Note
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground cursor-pointer"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className={`${dialogLayout.body} p-6 space-y-4`}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Note Title
            </label>
            <Input unstyled
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter title..."
              className="w-full px-4 py-2 border border-input rounded-control focus:ring-2 focus:ring-ring focus:border-warning-outline outline-none transition-all"
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
              minHeightClassName="min-h-[150px]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="unstyled"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-control font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </Button>
            <Button variant="unstyled"
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="px-5 py-2.5 rounded-control font-medium text-warning-foreground bg-warning hover:bg-warning disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>}</DialogSurface>;
}

