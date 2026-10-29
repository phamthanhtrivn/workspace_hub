"use client";
import { useId as useInputFieldId } from "react";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import { toast } from "sonner";
import { isAxiosError } from "axios";
import React, { useState, useEffect } from "react";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogSurface } from "@/components/ui/dialog";


interface EditPollModalProps {
  singleChoiceBlocked?: boolean;
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
  }) => void | Promise<unknown>;
}

const EditPollModal: React.FC<EditPollModalProps> = ({
  isOpen,
  singleChoiceBlocked = false,
  onClose,
  poll,
  onSubmit,
}) => {
  const inputFieldId = useInputFieldId();
  const [pending, setPending] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    try {
    await onSubmit({
      title,
      multipleChoice,
      allowAddOptions,
      anonymous,
      isLocked,
    });
    onClose();
    } catch (error) { toast.error(isAxiosError(error) ? error.response?.data?.message || "Unable to update poll" : "Unable to update poll"); }
    finally { setPending(false); }
  };

  if (!mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-70 flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Edit Poll
          </h2>
          <Button variant="unstyled" aria-label="Close"
            disabled={pending} onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className={`${dialogLayout.body} p-6 space-y-5`}>
          <div>
            <label htmlFor={`${inputFieldId}-field-95`} className="block text-sm font-medium text-foreground mb-1">
              Poll Question
            </label>
            <Input id={`${inputFieldId}-field-95`} aria-label="Poll Question" unstyled
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-4 py-2 border border-input rounded-control outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox

                disabled={pending || (singleChoiceBlocked && Boolean(poll.multipleChoice))}
                checked={multipleChoice}
                onCheckedChange={nextChecked => setMultipleChoice(nextChecked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring"
              />
              <span className="text-sm text-foreground">
                Allow multiple choices
              </span>
            </label>
            {singleChoiceBlocked && <p className="text-xs text-muted-foreground">Some participants selected multiple options. Create a new poll to use single choice.</p>}
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox

                checked={allowAddOptions}
                onCheckedChange={nextChecked => setAllowAddOptions(nextChecked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground">
                Allow members to add options
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox

                checked={anonymous}
                onCheckedChange={nextChecked => setAnonymous(nextChecked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground">
                Anonymous voting
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox

                checked={isLocked}
                onCheckedChange={nextChecked => setIsLocked(nextChecked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring cursor-pointer"
              />
              <span className="text-sm text-foreground font-medium">
                Lock poll (prevent further responses)
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button variant="default"
              type="submit"
              disabled={!title.trim()}
              className="flex-1 w-full py-2 px-4 rounded-control font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>}</DialogSurface>;
};

export default EditPollModal;

