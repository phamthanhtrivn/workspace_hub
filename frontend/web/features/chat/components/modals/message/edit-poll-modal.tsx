"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeCheckbox } from "@/components/ui/checkbox";
import { DialogSurface } from "@/components/ui/dialog";


interface EditPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: {
    title: string;
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
    isLocked?: boolean;
  } | null;
  onSubmit: (data: {
    title: string;
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
    isLocked: boolean;
  }) => void;
}

const EditPollModal: React.FC<EditPollModalProps> = ({
  isOpen,
  onClose,
  poll,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [multipleChoice, setMultipleChoice] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && poll) {
      setTitle(poll.title);
      setMultipleChoice(poll.multipleChoice);
      setAllowAddOptions(poll.allowAddOptions);
      setAnonymous(poll.anonymous ?? false);
      setIsLocked(poll.isLocked ?? false);
    }
  }, [isOpen, poll]);

  if (!isOpen || !poll) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title,
      multipleChoice,
      allowAddOptions,
      anonymous,
      isLocked,
    });
    onClose();
  };

  if (!mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-70 flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Edit Poll
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className={`${dialogLayout.body} p-6 space-y-5`}>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Poll Question
            </label>
            <Input unstyled
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-4 py-2 border border-input rounded-control focus:ring-2 focus:ring-ring focus:border-info-outline outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <NativeCheckbox

                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring"
              />
              <span className="text-sm text-foreground">
                Allow multiple choices
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <NativeCheckbox

                checked={allowAddOptions}
                onChange={(e) => setAllowAddOptions(e.target.checked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground">
                Allow members to add options
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <NativeCheckbox

                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground">
                Anonymous voting
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <NativeCheckbox

                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground font-medium">
                Lock poll (prevent further responses)
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button variant="unstyled"
              type="submit"
              disabled={!title.trim()}
              className="flex-1 w-full py-2 px-4 bg-primary text-primary-foreground rounded-control font-medium hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>}</DialogSurface>;
};

export default EditPollModal;

