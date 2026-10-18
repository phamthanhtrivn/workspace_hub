"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";

import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeCheckbox } from "@/components/ui/checkbox";
import { DialogSurface } from "@/components/ui/dialog";


interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    options: string[];
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
  }) => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multipleChoice, setMultipleChoice] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (!title.trim() || validOptions.length < 2) return;
    onSubmit({
      title,
      options: validOptions,
      multipleChoice,
      allowAddOptions,
      anonymous,
    });
    setTitle("");
    setOptions(["", ""]);
    onClose();
  };

  if (!mounted) return null;

  return <DialogSurface onClose={onClose}>{<div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-section-title font-semibold text-foreground">
            Create a Poll
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

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Options
            </label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input unstyled
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-input rounded-control focus:ring-2 focus:ring-ring focus:border-info-outline outline-none transition-all"
                  required={index < 2}
                />
                {options.length > 2 && (
                  <Button variant="unstyled" aria-label="Remove poll option"
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="p-2 text-muted-foreground hover:text-destructive-content hover:bg-destructive-soft rounded-control transition-colors"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="unstyled"
              type="button"
              onClick={handleAddOption}
              className="flex items-center gap-2 text-info-content hover:text-info-content text-sm font-medium p-2 rounded-control hover:bg-info-soft transition-colors cursor-pointer"
            >
              <Plus size={16} /> Add Option
            </Button>
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
                className="w-4 h-4 text-info-content rounded focus:ring-ring"
              />
              <span className="text-sm text-foreground">
                Allow members to add options
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <NativeCheckbox

                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 text-info-content rounded focus:ring-ring"
              />
              <span className="text-sm text-foreground">
                Anonymous voting
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button variant="unstyled"
              type="submit"
              disabled={
                !title.trim() || options.filter((o) => o.trim()).length < 2
              }
              className="cursor-pointer w-full bg-primary hover:bg-primary text-primary-foreground font-medium py-2.5 rounded-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Poll
            </Button>
          </div>
        </form>
      </div>
    </div>}</DialogSurface>;
};

export default CreatePollModal;

